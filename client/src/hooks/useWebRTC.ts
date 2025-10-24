import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWebSocketContext } from "../context/WebSocketContext";
import type { Player } from "shared";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PeerConnection {
  connection: RTCPeerConnection;
  stream?: MediaStream;
  audioElement?: HTMLAudioElement;
  dataChannel?: RTCDataChannel;
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
  ],
  iceCandidatePoolSize: 10,
};

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
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(new Map());
  
  // Player control state
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(new Set());
  const [hostMutedPlayers, setHostMutedPlayers] = useState<Set<string>>(new Set());
  const [hostMuted, setHostMuted] = useState(false);

  // Refs for managing connections
  const isNegotiatingRef = useRef<Map<string, boolean>>(new Map());
  const audioContextsRef = useRef<Map<string, AudioContext>>(new Map());
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const animationFramesRef = useRef<Map<string, number>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map());

  // Forward refs for circular dependencies
  const createOfferRef = useRef<(remotePlayerId: string) => Promise<void>>(null);
  const createPeerConnectionRef = useRef<(remotePlayerId: string) => RTCPeerConnection>(null);

  /**
   * Ensure AudioContext is running (fixes Firefox autoplay issues)
   */
  const ensureAudioContextRunning = useCallback(async (audioContext: AudioContext) => {
    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume();
        console.log("AudioContext resumed");
      } catch (error) {
        console.error("Failed to resume AudioContext:", error);
      }
    }
  }, []);

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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
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
   * Create and setup a DataChannel for a peer connection
   */
  const setupDataChannel = useCallback((pc: RTCPeerConnection, remotePlayerId: string, isInitiator: boolean) => {
    let dataChannel: RTCDataChannel;

    if (isInitiator) {
      // Create data channel if we're the initiator
      dataChannel = pc.createDataChannel("game-data");
      console.log(`[DataChannel] Created for peer: ${remotePlayerId}`);
    } else {
      // Listen for incoming data channel
      pc.ondatachannel = (event) => {
        dataChannel = event.channel;
        console.log(`[DataChannel] Received from peer: ${remotePlayerId}`);
        setupDataChannelListeners(dataChannel, remotePlayerId);
      };
      return; // Wait for ondatachannel event
    }

    setupDataChannelListeners(dataChannel, remotePlayerId);

    // Store reference in peer connection
    const peerConn = peerConnectionsRef.current.get(remotePlayerId);
    if (peerConn) {
      peerConn.dataChannel = dataChannel;
    }
  }, []);

  /**
   * Setup event listeners for a DataChannel
   */
  const setupDataChannelListeners = useCallback((dataChannel: RTCDataChannel, remotePlayerId: string) => {
    dataChannel.onopen = () => {
      console.log(`[DataChannel] Opened with ${remotePlayerId}`);
      // Send test message
      try {
        dataChannel.send(JSON.stringify({
          type: "TEST",
          from: localPlayerId,
          message: "DataChannel connection established"
        }));
      } catch (error) {
        console.error(`[DataChannel] Failed to send test message:`, error);
      }
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`[DataChannel] Message from ${remotePlayerId}:`, data);
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
  }, [localPlayerId]);

  /**
   * Create RTCPeerConnection for a remote player
   */
  const createPeerConnection = useCallback(
    (remotePlayerId: string): RTCPeerConnection => {
      if (!localStreamRef.current) {
        console.error("Cannot create peer connection - no local stream");
        throw new Error("Local stream not initialized");
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local audio tracks
      localStreamRef.current.getTracks().forEach((track) => {
        console.log(`Adding ${track.kind} track to peer: ${remotePlayerId}`);
        pc.addTrack(track, localStreamRef.current!);
      });

      // Setup DataChannel (we initiate if we're creating the offer)
      setupDataChannel(pc, remotePlayerId, true);

      // Handle incoming remote stream
      pc.ontrack = async (event) => {
        console.log(`Received remote track from: ${remotePlayerId}`);
        const [remoteStream] = event.streams;

        const peerConn = peerConnectionsRef.current.get(remotePlayerId);
        if (!peerConn) {
          console.warn("No peer connection found for ontrack event");
          return;
        }

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
        } catch (err: any) {
          console.warn("Audio play failed:", err.message);
          // Setup retry on user interaction if needed
          if (err.name === "NotAllowedError") {
            setAudioError(t("voiceChat.audioPlaybackFailed", { player: remotePlayerId }) || 
              "Audio playback blocked. Click anywhere to enable.");
            
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
            
            document.addEventListener("click", playOnInteraction, { once: true });
            document.addEventListener("keydown", playOnInteraction, { once: true });
          }
        }
      };

      // Handle negotiation
      pc.onnegotiationneeded = async () => {
        if (!isNegotiatingRef.current.get(remotePlayerId) && pc.signalingState === "stable") {
          if (createOfferRef.current) {
            await createOfferRef.current(remotePlayerId);
          }
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
        console.log(`Connection state with ${remotePlayerId}:`, pc.connectionState);
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          console.log(`Attempting to reconnect to ${remotePlayerId}`);
          setTimeout(() => {
            if (pc.connectionState !== "connected" && createOfferRef.current) {
              createOfferRef.current(remotePlayerId);
            }
          }, 3000);
        }
      };

      peerConnectionsRef.current.set(remotePlayerId, { connection: pc });
      return pc;
    },
    [sendMessage, mutedPlayers, setupAudioAnalysis, setupDataChannel, t]
  );

  /**
   * Create and send offer to remote player
   */
  const createOffer = useCallback(
    async (remotePlayerId: string) => {
      if (!localStreamRef.current) {
        console.error("Cannot create offer - no local stream");
        return;
      }

      if (isNegotiatingRef.current.get(remotePlayerId)) {
        console.log("Already negotiating with:", remotePlayerId);
        return;
      }

      let peerData = peerConnectionsRef.current.get(remotePlayerId);
      if (!peerData && createPeerConnectionRef.current) {
        console.log("Creating new peer connection for:", remotePlayerId);
        try {
          createPeerConnectionRef.current(remotePlayerId);
          peerData = peerConnectionsRef.current.get(remotePlayerId);
        } catch (error) {
          console.error("Failed to create peer connection:", error);
          return;
        }
      }

      if (!peerData) {
        console.error("No peer connection available for:", remotePlayerId);
        return;
      }

      const pc = peerData.connection;
      if (pc.signalingState !== "stable") {
        console.log("Cannot create offer, signaling state:", pc.signalingState);
        return;
      }

      isNegotiatingRef.current.set(remotePlayerId, true);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendMessage({
          type: "RTC_OFFER",
          payload: {
            targetPlayerId: remotePlayerId,
            signal: offer,
          },
        });

        console.log("Offer sent to:", remotePlayerId);
      } catch (error) {
        console.error("Error creating offer:", error);
        isNegotiatingRef.current.set(remotePlayerId, false);
      }
    },
    [sendMessage]
  );

  // Update refs
  useEffect(() => {
    createOfferRef.current = createOffer;
  }, [createOffer]);

  useEffect(() => {
    createPeerConnectionRef.current = createPeerConnection;
  }, [createPeerConnection]);

  /**
   * Handle incoming WebRTC offer
   */
  const handleOffer = useCallback(
    async (fromPlayerId: string, offer: RTCSessionDescriptionInit) => {
      if (!isVoiceEnabled || !localStreamRef.current) {
        console.log("Ignoring offer - voice chat not enabled");
        return;
      }

      let pc = peerConnectionsRef.current.get(fromPlayerId)?.connection;

      // Recreate connection if in wrong state
      if (pc && pc.signalingState !== "stable") {
        console.log("Closing existing connection in state:", pc.signalingState);
        pc.close();
        isNegotiatingRef.current.set(fromPlayerId, false);
        if (createPeerConnectionRef.current) {
          pc = createPeerConnectionRef.current(fromPlayerId);
        }
      } else if (!pc && createPeerConnectionRef.current) {
        pc = createPeerConnectionRef.current(fromPlayerId);
      }

      if (!pc) {
        console.error("Failed to get peer connection for:", fromPlayerId);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Add pending ICE candidates
        const pendingCandidates = pendingCandidatesRef.current.get(fromPlayerId) || [];
        for (const candidate of pendingCandidates) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (err) {
            console.warn("Failed to add pending ICE candidate:", err);
          }
        }
        pendingCandidatesRef.current.delete(fromPlayerId);

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendMessage({
          type: "RTC_ANSWER",
          payload: {
            targetPlayerId: fromPlayerId,
            signal: answer,
          },
        });

        console.log("Answer sent to:", fromPlayerId);
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    },
    [sendMessage, isVoiceEnabled]
  );

  /**
   * Handle incoming WebRTC answer
   */
  const handleAnswer = useCallback(
    async (fromPlayerId: string, answer: RTCSessionDescriptionInit) => {
      const peerConn = peerConnectionsRef.current.get(fromPlayerId);
      if (!peerConn) return;

      try {
        await peerConn.connection.setRemoteDescription(new RTCSessionDescription(answer));
        isNegotiatingRef.current.set(fromPlayerId, false);

        // Add pending ICE candidates
        const pendingCandidates = pendingCandidatesRef.current.get(fromPlayerId) || [];
        for (const candidate of pendingCandidates) {
          await peerConn.connection.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current.delete(fromPlayerId);

        console.log("Answer processed from:", fromPlayerId);
      } catch (error) {
        console.error("Error handling answer:", error);
        isNegotiatingRef.current.set(fromPlayerId, false);
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

      if (!peerConn) {
        // Store for later if peer connection doesn't exist
        const pending = pendingCandidatesRef.current.get(fromPlayerId) || [];
        pending.push(new RTCIceCandidate(candidate));
        pendingCandidatesRef.current.set(fromPlayerId, pending);
        console.log("Stored ICE candidate for later:", fromPlayerId);
        return;
      }

      try {
        if (peerConn.connection.remoteDescription && peerConn.connection.signalingState !== "closed") {
          await peerConn.connection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("Added ICE candidate from:", fromPlayerId);
        } else {
          // Store for later
          const pending = pendingCandidatesRef.current.get(fromPlayerId) || [];
          pending.push(new RTCIceCandidate(candidate));
          pendingCandidatesRef.current.set(fromPlayerId, pending);
        }
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
    if (isVoiceEnabled) return;

    const stream = await initializeAudio();
    if (!stream) return;

    localStreamRef.current = stream;
    setIsVoiceEnabled(true);

    // Wait for WebSocket to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get other players (not self, not bots, connected only)
    const otherPlayers = players.filter(
      (p) => p.id !== localPlayerId && !p.isBot && p.isConnected
    );

    // Create peer connections
    otherPlayers.forEach((player) => {
      if (!peerConnectionsRef.current.has(player.id)) {
        console.log("Pre-creating peer connection for:", player.id);
        if (createPeerConnectionRef.current) {
          createPeerConnectionRef.current(player.id);
        }
      }
    });

    // Small delay then create offers
    await new Promise((resolve) => setTimeout(resolve, 100));
    for (const player of otherPlayers) {
      console.log("Creating offer for:", player.id);
      await createOffer(player.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }, [isVoiceEnabled, initializeAudio, players, localPlayerId, createOffer]);

  /**
   * Disable voice chat - cleanup all connections
   */
  const disableVoiceChat = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Cleanup audio analysis
    animationFramesRef.current.forEach((frameId) => cancelAnimationFrame(frameId));
    animationFramesRef.current.clear();

    audioContextsRef.current.forEach((ctx) => {
      if (ctx.state !== "closed") ctx.close();
    });
    audioContextsRef.current.clear();

    analysersRef.current.clear();
    setAudioLevels(new Map());

    // Close peer connections and cleanup
    peerConnectionsRef.current.forEach((peerConn) => {
      if (peerConn.audioElement) {
        peerConn.audioElement.pause();
        peerConn.audioElement.srcObject = null;
        if (peerConn.audioElement.parentNode) {
          peerConn.audioElement.parentNode.removeChild(peerConn.audioElement);
        }
      }
      if (peerConn.dataChannel) {
        peerConn.dataChannel.close();
      }
      peerConn.connection.close();
    });
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    isNegotiatingRef.current.clear();

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

    const unregisterPlayerKicked = registerHandler("player-kicked", (message) => {
      if (message.type === "PLAYER_KICKED") {
        const { playerId } = message.payload;
        if (playerId === localPlayerId) {
          disableVoiceChat();
          toast.error(t("voiceChat.kickedByHost"));
          navigate("/");
        }
      }
    });

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

  // Handle players joining/leaving
  useEffect(() => {
    if (!isVoiceEnabled) return;

    const currentPeerIds = new Set(peerConnectionsRef.current.keys());
    const activePlayers = players.filter(
      (p) => p.id !== localPlayerId && !p.isBot && p.isConnected
    );

    // Create connections for new players
    activePlayers.forEach((player) => {
      if (!currentPeerIds.has(player.id)) {
        createOffer(player.id);
      }
    });

    // Cleanup connections for players who left
    currentPeerIds.forEach((peerId) => {
      const playerExists = activePlayers.some((p) => p.id === peerId);
      if (!playerExists) {
        const peerConn = peerConnectionsRef.current.get(peerId);
        if (peerConn) {
          if (peerConn.audioElement) {
            peerConn.audioElement.pause();
            peerConn.audioElement.srcObject = null;
            if (peerConn.audioElement.parentNode) {
              peerConn.audioElement.parentNode.removeChild(peerConn.audioElement);
            }
          }
          if (peerConn.dataChannel) {
            peerConn.dataChannel.close();
          }
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
    });
  }, [players, localPlayerId, isVoiceEnabled, createOffer]);

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
  };
}
