import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWebSocketContext } from "../context/WebSocketContext";
import type { 
  Player, 
  DataChannelMessage, 
  DataChannelChatPayload,
  ChatHistoryRequestPayload,
  ChatHistoryResponsePayload
} from "shared";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PeerConnection {
  connection: RTCPeerConnection;
  stream?: MediaStream;
  audioElement?: HTMLAudioElement;
  dataChannel?: RTCDataChannel;
  makingOffer?: boolean;
  ignoreOffer?: boolean;
  isSettingRemoteAnswerPending?: boolean;
}

interface WebRTCConfig {
  roomId: string;
  localPlayerId: string;
  players: Player[];
  isHost?: boolean;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // Add a free TURN server for same-PC testing
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Determines if this peer should be "polite" (yields in negotiation conflicts)
 * Uses lexicographic comparison of player IDs for deterministic behavior
 */
function isPolite(localId: string, remoteId: string): boolean {
  return localId > remoteId;
}

/**
 * Hook for managing WebRTC peer connections for voice chat and data channels
 */
export function useWebRTC({
  localPlayerId,
  players,
  isHost = false,
}: WebRTCConfig) {
  const { sendMessage, registerHandler } = useWebSocketContext();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Voice state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(
    new Map()
  );

  // Player control state
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(new Set());
  const [hostMutedPlayers, setHostMutedPlayers] = useState<Set<string>>(
    new Set()
  );
  const [hostMuted, setHostMuted] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<DataChannelChatPayload[]>([]);
  const chatMessagesRef = useRef<DataChannelChatPayload[]>([]);
  const chatCallbackRef = useRef<((message: DataChannelChatPayload) => void) | null>(null);

  // Keep chatMessagesRef in sync with chatMessages state
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // Refs for managing connections
  const audioContextsRef = useRef<Map<string, AudioContext>>(new Map());
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const animationFramesRef = useRef<Map<string, number>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(
    new Map()
  );

  /**
   * Ensure AudioContext is running (fixes Firefox autoplay issues)
   */
  const ensureAudioContextRunning = useCallback(
    async (audioContext: AudioContext) => {
      if (audioContext.state === "suspended") {
        try {
          await audioContext.resume();
          console.log("AudioContext resumed");
        } catch (error) {
          console.error("Failed to resume AudioContext:", error);
        }
      }
    },
    []
  );

  /**
   * Initialize local audio stream with microphone access
   */
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;
      setAudioError(null);
      console.log("Local audio stream initialized");
      return stream;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setAudioError(`Microphone access denied: ${errorMessage}`);
      console.error("Error accessing microphone:", error);
      return null;
    }
  }, []);

  /**
   * Setup audio level detection for a remote peer
   */
  const setupAudioAnalysis = useCallback(
    async (remotePlayerId: string, remoteStream: MediaStream) => {
      try {
        const audioContext = new AudioContext();
        await ensureAudioContextRunning(audioContext);

        const source = audioContext.createMediaStreamSource(remoteStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        audioContextsRef.current.set(remotePlayerId, audioContext);
        analysersRef.current.set(remotePlayerId, analyser);

        // Monitor audio levels
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const level = Math.min(100, (average / 128) * 100);

          setAudioLevels((prev) => {
            const newMap = new Map(prev);
            newMap.set(remotePlayerId, level);
            return newMap;
          });

          const frameId = requestAnimationFrame(updateLevel);
          animationFramesRef.current.set(remotePlayerId, frameId);
        };
        updateLevel();
      } catch (error) {
        console.error("Error setting up audio analysis:", error);
      }
    },
    [ensureAudioContextRunning]
  );

  /**
   * Setup event listeners for a DataChannel
   */
  const setupDataChannelListeners = useCallback(
    (dataChannel: RTCDataChannel, remotePlayerId: string) => {
      dataChannel.onopen = () => {
        console.log(`[DataChannel] Opened with ${remotePlayerId}`);
        
        // Request chat history from this peer
        try {
          const historyRequest: DataChannelMessage = {
            type: "REQUEST_CHAT_HISTORY",
            payload: { requesterId: localPlayerId } as ChatHistoryRequestPayload,
            timestamp: Date.now(),
          };
          dataChannel.send(JSON.stringify(historyRequest));
          console.log(`[DataChannel] Requested chat history from ${remotePlayerId}`);
        } catch (error) {
          console.error(`[DataChannel] Failed to request chat history:`, error);
        }
      };

      dataChannel.onmessage = (event) => {
        try {
          const message: DataChannelMessage = JSON.parse(event.data);
          console.log(`[DataChannel] Message from ${remotePlayerId}:`, message);
          
          switch (message.type) {
            case "CHAT_MESSAGE": {
              // Handle incoming chat message
              const chatPayload = message.payload as DataChannelChatPayload;
              setChatMessages((prev) => {
                // Check for duplicates
                const exists = prev.some(
                  (m) =>
                    m.playerId === chatPayload.playerId &&
                    m.timestamp === chatPayload.timestamp
                );
                if (exists) return prev;
                
                // Add and sort by timestamp
                const updated = [...prev, chatPayload].sort((a, b) => a.timestamp - b.timestamp);
                return updated;
              });
              
              // Call the chat callback if registered
              if (chatCallbackRef.current) {
                chatCallbackRef.current(chatPayload);
              }
              break;
            }
              
            case "REQUEST_CHAT_HISTORY": {
              // Send our chat history to the requester
              const historyPayload = message.payload as ChatHistoryRequestPayload;
              console.log(`[DataChannel] Received chat history request from ${historyPayload.requesterId}`);
              
              const response: DataChannelMessage = {
                type: "CHAT_HISTORY_RESPONSE",
                payload: {
                  messages: chatMessagesRef.current,
                  responderId: localPlayerId,
                } as ChatHistoryResponsePayload,
                timestamp: Date.now(),
              };
              dataChannel.send(JSON.stringify(response));
              break;
            }
              
            case "CHAT_HISTORY_RESPONSE": {
              // Merge received chat history
              const historyResponse = message.payload as ChatHistoryResponsePayload;
              console.log(`[DataChannel] Received chat history from ${historyResponse.responderId}:`, historyResponse.messages.length, "messages");
              
              setChatMessages((prev) => {
                // Merge and deduplicate
                const merged = [...prev];
                for (const msg of historyResponse.messages) {
                  const exists = merged.some(
                    (m) =>
                      m.playerId === msg.playerId &&
                      m.timestamp === msg.timestamp
                  );
                  if (!exists) {
                    merged.push(msg);
                  }
                }
                // Sort by timestamp
                return merged.sort((a, b) => a.timestamp - b.timestamp);
              });
              break;
            }
          }
        } catch (error) {
          console.error(`[DataChannel] Failed to parse message:`, error);
        }
      };

      dataChannel.onclose = () => {
        console.log(`[DataChannel] Closed with ${remotePlayerId}`);
      };

      dataChannel.onerror = (error) => {
        console.error(`[DataChannel] Error with ${remotePlayerId}:`, error);
      };
    },
    [localPlayerId]
  );

  /**
   * Create and setup a RTCPeerConnection for a remote player
   * Uses "perfect negotiation" pattern to avoid glare
   * Can create connections for data channels only (without audio)
   */
  const createPeerConnection = useCallback(
    (remotePlayerId: string): RTCPeerConnection => {
      // Determine if this peer should be polite
      const polite = isPolite(localPlayerId, remotePlayerId);
      console.log(
        `Creating peer connection with ${remotePlayerId} (${polite ? "polite" : "impolite"})`
      );

      const pc = new RTCPeerConnection(ICE_SERVERS);
      const peerConn: PeerConnection = {
        connection: pc,
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
      };
      peerConnectionsRef.current.set(remotePlayerId, peerConn);

      // Add local audio tracks if available (voice chat enabled)
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          console.log(`Adding ${track.kind} track to peer: ${remotePlayerId}`);
          pc.addTrack(track, localStreamRef.current);
        }
      }

      // Create data channel only if we're the impolite peer (to avoid duplicates)
      if (!polite) {
        const dataChannel = pc.createDataChannel("game-data");
        console.log(`[DataChannel] Created for peer: ${remotePlayerId}`);
        setupDataChannelListeners(dataChannel, remotePlayerId);
        peerConn.dataChannel = dataChannel;
      }

      // Handle incoming data channel (polite peer)
      pc.ondatachannel = (event) => {
        console.log(`[DataChannel] Received from peer: ${remotePlayerId}`);
        peerConn.dataChannel = event.channel;
        setupDataChannelListeners(event.channel, remotePlayerId);
      };

      // Handle incoming remote stream
      pc.ontrack = async (event) => {
        console.log(`Received remote track from: ${remotePlayerId}`);
        const [remoteStream] = event.streams;
        peerConn.stream = remoteStream;

        // Create and attach audio element
        const audioElement = new Audio();
        audioElement.srcObject = remoteStream;
        audioElement.autoplay = true;
        audioElement.volume = mutedPlayers.has(remotePlayerId) ? 0 : 1;
        audioElement.style.display = "none";
        document.body.appendChild(audioElement);
        peerConn.audioElement = audioElement;

        // Setup audio analysis
        await setupAudioAnalysis(remotePlayerId, remoteStream);

        // Handle audio playback with retry
        try {
          await audioElement.play();
          console.log(`Audio playing for: ${remotePlayerId}`);
        } catch (err: unknown) {
          const error = err as Error & { name?: string };
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.warn("Audio play failed:", errorMessage);
          if (error && error.name === "NotAllowedError") {
            setAudioError(
              t("voiceChat.audioPlaybackFailed", { player: remotePlayerId }) ||
                "Audio playback blocked. Click anywhere to enable."
            );

            const playOnInteraction = async () => {
              try {
                await audioElement.play();
                setAudioError(null);
                document.removeEventListener("click", playOnInteraction);
                document.removeEventListener("keydown", playOnInteraction);
              } catch (e) {
                console.error("Still failed after user interaction:", e);
              }
            };

            document.addEventListener("click", playOnInteraction, {
              once: true,
            });
            document.addEventListener("keydown", playOnInteraction, {
              once: true,
            });
          }
        }
      };

      // Perfect negotiation pattern
      pc.onnegotiationneeded = async () => {
        try {
          peerConn.makingOffer = true;
          await pc.setLocalDescription();
          sendMessage({
            type: "RTC_OFFER",
            payload: {
              targetPlayerId: remotePlayerId,
              signal: pc.localDescription,
            },
          });
          console.log(`Offer sent to: ${remotePlayerId}`);
        } catch (err) {
          console.error("Error during negotiation:", err);
        } finally {
          peerConn.makingOffer = false;
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({
            type: "RTC_ICE_CANDIDATE",
            payload: {
              targetPlayerId: remotePlayerId,
              signal: event.candidate,
            },
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(
          `Connection state with ${remotePlayerId}:`,
          pc.connectionState
        );
        if (pc.connectionState === "failed") {
          console.error(`Connection failed with ${remotePlayerId}`);
          // Optionally trigger reconnection
          pc.restartIce();
        }
      };

      return pc;
    },
    [
      localPlayerId,
      sendMessage,
      mutedPlayers,
      setupAudioAnalysis,
      setupDataChannelListeners,
      t,
    ]
  );

  /**
   * Handle incoming WebRTC offer (perfect negotiation)
   */
  const handleOffer = useCallback(
    async (fromPlayerId: string, offer: RTCSessionDescriptionInit) => {
      // Accept offers for both voice and data channel connections
      let peerConn = peerConnectionsRef.current.get(fromPlayerId);
      if (!peerConn) {
        createPeerConnection(fromPlayerId);
        peerConn = peerConnectionsRef.current.get(fromPlayerId);
      }

      if (!peerConn) {
        console.error("Failed to get peer connection for:", fromPlayerId);
        return;
      }

      const pc = peerConn.connection;
      const polite = isPolite(localPlayerId, fromPlayerId);

      // Perfect negotiation: handle offer collision
      const offerCollision =
        pc.signalingState !== "stable" || peerConn.makingOffer;

      peerConn.ignoreOffer = !polite && offerCollision;

      if (peerConn.ignoreOffer) {
        console.log(
          `Ignoring offer from ${fromPlayerId} (collision, we're impolite)`
        );
        return;
      }

      try {
        await pc.setRemoteDescription(offer);

        // Add pending ICE candidates
        const pendingCandidates =
          pendingCandidatesRef.current.get(fromPlayerId) || [];
        for (const candidate of pendingCandidates) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (err) {
            console.warn("Failed to add pending ICE candidate:", err);
          }
        }
        pendingCandidatesRef.current.delete(fromPlayerId);

        // Create and send answer
        await pc.setLocalDescription();
        sendMessage({
          type: "RTC_ANSWER",
          payload: {
            targetPlayerId: fromPlayerId,
            signal: pc.localDescription,
          },
        });

        console.log("Answer sent to:", fromPlayerId);
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    },
    [localPlayerId, createPeerConnection, sendMessage]
  );

  /**
   * Handle incoming WebRTC answer
   */
  const handleAnswer = useCallback(
    async (fromPlayerId: string, answer: RTCSessionDescriptionInit) => {
      const peerConn = peerConnectionsRef.current.get(fromPlayerId);
      if (!peerConn) {
        console.warn("No peer connection found for answer from:", fromPlayerId);
        return;
      }

      const pc = peerConn.connection;

      try {
        peerConn.isSettingRemoteAnswerPending = true;
        await pc.setRemoteDescription(answer);

        // Add pending ICE candidates
        const pendingCandidates =
          pendingCandidatesRef.current.get(fromPlayerId) || [];
        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current.delete(fromPlayerId);

        console.log("Answer processed from:", fromPlayerId);
      } catch (error) {
        console.error("Error handling answer:", error);
      } finally {
        peerConn.isSettingRemoteAnswerPending = false;
      }
    },
    []
  );

  /**
   * Handle incoming ICE candidate
   */
  const handleIceCandidate = useCallback(
    async (fromPlayerId: string, candidate: RTCIceCandidateInit) => {
      const peerConn = peerConnectionsRef.current.get(fromPlayerId);

      if (!peerConn?.connection.remoteDescription) {
        // Store for later if peer connection doesn't exist or remote description not set
        const pending = pendingCandidatesRef.current.get(fromPlayerId) || [];
        pending.push(new RTCIceCandidate(candidate));
        pendingCandidatesRef.current.set(fromPlayerId, pending);
        console.log("Stored ICE candidate for later:", fromPlayerId);
        return;
      }

      try {
        await peerConn.connection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
        console.log("Added ICE candidate from:", fromPlayerId);
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    },
    []
  );

  /**
   * Enable voice chat - get mic access and create connections
   */
  const enableVoiceChat = useCallback(async () => {
    console.log("Enabling voice chat");
    if (isVoiceEnabled) return;

    const stream = await initializeAudio();
    if (!stream) return;
    console.log("initialized   audio stream");

    localStreamRef.current = stream;
    setIsVoiceEnabled(true);

    // Get other players (not self, not bots, connected only)
    const otherPlayers = players.filter(
      (p) => p.id !== localPlayerId && !p.isBot && p.isConnected
    );

    console.log(`Creating connections for ${otherPlayers.length} players`);

    if (otherPlayers.length === 0) {
      console.log(
        "No other players available yet. Connections will be created as players join."
      );
    }

    // Create peer connections for all other players
    for (const player of otherPlayers) {
      if (!peerConnectionsRef.current.has(player.id)) {
        console.log("Creating peer connection for:", player.id);
        createPeerConnection(player.id);
      }
    }
  }, [
    isVoiceEnabled,
    initializeAudio,
    players,
    localPlayerId,
    createPeerConnection,
  ]);

  /**
   * Disable voice chat - cleanup all connections
   */
  const disableVoiceChat = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
    }

    // Cleanup audio analysis
    for (const frameId of animationFramesRef.current.values()) {
      cancelAnimationFrame(frameId);
    }
    animationFramesRef.current.clear();

    for (const ctx of audioContextsRef.current.values()) {
      if (ctx.state !== "closed") ctx.close();
    }
    audioContextsRef.current.clear();

    analysersRef.current.clear();
    setAudioLevels(new Map());

    // Close peer connections and cleanup
    for (const peerConn of peerConnectionsRef.current.values()) {
      if (peerConn.audioElement) {
        peerConn.audioElement.pause();
        peerConn.audioElement.srcObject = null;
        peerConn.audioElement.remove();
      }
      if (peerConn.dataChannel) {
        peerConn.dataChannel.close();
      }
      peerConn.connection.close();
    }
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

    setIsVoiceEnabled(false);
    setIsMuted(false);
  }, []);

  /**
   * Toggle local microphone mute
   */
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current || hostMuted) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, [hostMuted]);

  /**
   * Toggle mute for specific player (local audio only)
   */
  const togglePlayerMute = useCallback((playerId: string) => {
    setMutedPlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }

      // Update audio element volume
      const peerConn = peerConnectionsRef.current.get(playerId);
      if (peerConn?.audioElement) {
        peerConn.audioElement.volume = newSet.has(playerId) ? 0 : 1;
      }

      return newSet;
    });
  }, []);

  /**
   * Host kicks a player
   */
  const kickPlayer = useCallback(
    (playerId: string) => {
      if (!isHost) return;
      sendMessage({
        type: "KICK_PLAYER",
        payload: { playerId },
      });
    },
    [isHost, sendMessage]
  );

  /**
   * Host mutes/unmutes player's microphone
   */
  const mutePlayerMic = useCallback(
    (playerId: string, mute: boolean) => {
      if (!isHost) return;

      sendMessage({
        type: "SWITCH_PLAYER_MIC",
        payload: { playerId, mute },
      });

      setHostMutedPlayers((prev) => {
        const newSet = new Set(prev);
        if (mute) {
          newSet.add(playerId);
        } else {
          newSet.delete(playerId);
        }
        return newSet;
      });
    },
    [isHost, sendMessage]
  );

  /**
   * Send a chat message through WebRTC data channels to all connected peers
   */
  const sendChatMessage = useCallback(
    (message: string, playerName: string) => {
      const chatPayload: DataChannelChatPayload = {
        message,
        playerId: localPlayerId,
        playerName,
        timestamp: Date.now(),
      };

      const dataChannelMessage: DataChannelMessage = {
        type: "CHAT_MESSAGE",
        payload: chatPayload,
        timestamp: chatPayload.timestamp,
      };

      const messageStr = JSON.stringify(dataChannelMessage);

      // Add to local chat history
      setChatMessages((prev) => {
        const exists = prev.some(
          (m) => m.playerId === chatPayload.playerId && m.timestamp === chatPayload.timestamp
        );
        if (exists) return prev;
        return [...prev, chatPayload].sort((a, b) => a.timestamp - b.timestamp);
      });

      // Send to all connected peers
      let sentCount = 0;
      for (const peerConn of peerConnectionsRef.current.values()) {
        if (
          peerConn.dataChannel &&
          peerConn.dataChannel.readyState === "open"
        ) {
          try {
            peerConn.dataChannel.send(messageStr);
            sentCount++;
          } catch (error) {
            console.error("[DataChannel] Failed to send chat message:", error);
          }
        }
      }

      console.log(`[Chat] Sent message to ${sentCount} peers`);
    },
    [localPlayerId]
  );

  /**
   * Register a callback to receive chat messages
   */
  const registerChatCallback = useCallback(
    (callback: (message: DataChannelChatPayload) => void) => {
      chatCallbackRef.current = callback;
      
      // Return unregister function
      return () => {
        chatCallbackRef.current = null;
      };
    },
    []
  );

  // Register WebSocket handlers for WebRTC signaling
  useEffect(() => {
    const unregisterOffer = registerHandler("rtc-offer", (message) => {
      if (message.type === "RTC_OFFER") {
        const { fromPlayerId, signal } = message.payload;
        handleOffer(fromPlayerId, signal);
      }
    });

    const unregisterAnswer = registerHandler("rtc-answer", (message) => {
      if (message.type === "RTC_ANSWER") {
        const { fromPlayerId, signal } = message.payload;
        handleAnswer(fromPlayerId, signal);
      }
    });

    const unregisterIceCandidate = registerHandler("rtc-ice", (message) => {
      if (message.type === "RTC_ICE_CANDIDATE") {
        const { fromPlayerId, signal } = message.payload;
        handleIceCandidate(fromPlayerId, signal);
      }
    });

    const unregisterPlayerMuted = registerHandler("player-muted", (message) => {
      if (message.type === "PLAYER_MIC_SWITCHED") {
        const { playerId, mute } = message.payload;

        if (isHost) {
          setHostMutedPlayers((prev) => {
            const newSet = new Set(prev);
            if (mute) newSet.add(playerId);
            else newSet.delete(playerId);
            return newSet;
          });
        }

        if (playerId === localPlayerId) {
          setHostMuted(mute);
          if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = !mute;
              setIsMuted(mute);
              toast[mute ? "warning" : "success"](
                t(mute ? "voiceChat.hostMutedYou" : "voiceChat.hostUnmutedYou")
              );
            }
          }
        }
      }
    });

    const unregisterPlayerKicked = registerHandler(
      "player-kicked",
      (message) => {
        if (message.type === "PLAYER_KICKED") {
          const { playerId } = message.payload;
          if (playerId === localPlayerId) {
            disableVoiceChat();
            toast.error(t("voiceChat.kickedByHost"));
            navigate("/");
          }
        }
      }
    );

    return () => {
      unregisterOffer();
      unregisterAnswer();
      unregisterIceCandidate();
      unregisterPlayerMuted();
      unregisterPlayerKicked();
    };
  }, [
    registerHandler,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    localPlayerId,
    disableVoiceChat,
    navigate,
    isHost,
    t,
  ]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (isVoiceEnabled) {
        console.log(
          "useWebRTC hook unmounting - cleaning up voice connections"
        );
        disableVoiceChat();
      }
    };
    // Only run on unmount - empty dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle players joining/leaving (for both voice and chat)
  useEffect(() => {
    const currentPeerIds = new Set(peerConnectionsRef.current.keys());
    const activePlayers = players.filter(
      (p) => p.id !== localPlayerId && !p.isBot && p.isConnected
    );

    // Create connections for new players
    for (const player of activePlayers) {
      if (!currentPeerIds.has(player.id)) {
        console.log("New player joined, creating connection:", player.id);
        createPeerConnection(player.id);
      }
    }

    // Cleanup connections for players who left
    for (const peerId of currentPeerIds) {
      const playerExists = activePlayers.some((p) => p.id === peerId);
      if (!playerExists) {
        console.log("Player left, cleaning up connection:", peerId);
        const peerConn = peerConnectionsRef.current.get(peerId);
        if (peerConn) {
          // Cleanup audio element (if voice was enabled)
          if (peerConn.audioElement) {
            peerConn.audioElement.pause();
            peerConn.audioElement.srcObject = null;
            peerConn.audioElement.remove();
          }
          
          // Cleanup data channel (for chat)
          if (peerConn.dataChannel) {
            peerConn.dataChannel.close();
          }
          
          // Close peer connection
          peerConn.connection.close();
          peerConnectionsRef.current.delete(peerId);
        }

        // Cleanup audio analysis
        const frameId = animationFramesRef.current.get(peerId);
        if (frameId) {
          cancelAnimationFrame(frameId);
          animationFramesRef.current.delete(peerId);
        }

        const audioContext = audioContextsRef.current.get(peerId);
        if (audioContext && audioContext.state !== "closed") {
          audioContext.close();
          audioContextsRef.current.delete(peerId);
        }

        analysersRef.current.delete(peerId);
        setAudioLevels((prev) => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
        });
      }
    }
  }, [players, localPlayerId, createPeerConnection]);

  return {
    // Voice state
    isVoiceEnabled,
    isMuted,
    audioError,
    audioLevels,
    // Player control
    mutedPlayers,
    hostMutedPlayers,
    hostMuted,
    isHost,
    // Voice methods
    enableVoiceChat,
    disableVoiceChat,
    toggleMute,
    togglePlayerMute,
    kickPlayer,
    mutePlayerMic,
    // Chat methods
    sendChatMessage,
    registerChatCallback,
    chatMessages,
  };
}
