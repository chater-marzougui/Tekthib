import "webrtc-adapter";
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
}

interface VoiceChatConfig {
  roomId: string;
  localPlayerId: string;
  players: Player[];
  isHost?: boolean;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }, // Add more STUN servers
  ],
  iceCandidatePoolSize: 10, // Better ICE gathering
};

export function useVoiceChat({
  localPlayerId,
  players,
  isHost = false,
}: VoiceChatConfig) {
  const { sendMessage, registerHandler } = useWebSocketContext();
  const { t } = useTranslation();
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(
    new Map()
  );

  // Check if voice was previously enabled (persist across page navigation)
  const wasVoiceEnabled = sessionStorage.getItem("voiceChatEnabled") === "true";

  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(wasVoiceEnabled);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(new Set());
  const [hostMutedPlayers, setHostMutedPlayers] = useState<Set<string>>(
    new Set()
  );
  const [hostMuted, setHostMuted] = useState(false);

  const audioContextsRef = useRef<Map<string, AudioContext>>(new Map());
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const animationFramesRef = useRef<Map<string, number>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(
    new Map()
  );
  const navigate = useNavigate();

  // Helper to ensure AudioContext is running (Firefox fix)
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

  // Initialize audio stream
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
      return stream;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setAudioError(`Microphone access denied: ${errorMessage}`);
      console.error("Error accessing microphone:", error);
      return null;
    }
  }, []);

  // Forward ref for createOffer to break circular dependency
  const createOfferRef = useRef<(remotePlayerId: string) => Promise<void>>(null);

  // Create peer connection for a remote player
  const createPeerConnection = useCallback(
    (remotePlayerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local stream tracks to the connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          console.log(
            "Adding track to peer connection:",
            remotePlayerId,
            track.kind
          );
          pc.addTrack(track, localStreamRef.current!);
        });
      } else {
        console.warn("No local stream available when creating peer connection");
      }

      // Handle incoming remote stream
      pc.ontrack = async (event) => {
        console.log("Received remote track from:", remotePlayerId);
        const [remoteStream] = event.streams;

        const peerConn = peerConnectionsRef.current.get(remotePlayerId);
        if (!peerConn) {
          console.warn(
            "No peer connection found for ontrack event:",
            remotePlayerId
          );
          return;
        }

        peerConn.stream = remoteStream;

        // Create audio element and play - Firefox compatible
        const audioElement = new Audio();
        audioElement.srcObject = remoteStream;
        audioElement.autoplay = true;
        audioElement.volume = mutedPlayers.has(remotePlayerId) ? 0 : 1;

        // CRITICAL for Firefox: attach to DOM
        audioElement.style.display = "none";
        document.body.appendChild(audioElement);

        peerConn.audioElement = audioElement;

        // Setup audio level detection
        try {
          const audioContext = new AudioContext();

          // FIREFOX FIX: Ensure AudioContext is running
          await ensureAudioContextRunning(audioContext);

          const source = audioContext.createMediaStreamSource(remoteStream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);

          audioContextsRef.current.set(remotePlayerId, audioContext);
          analysersRef.current.set(remotePlayerId, analyser);

          // Start monitoring audio levels
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

        // Better play handling with retry logic
        const playAudio = async () => {
          try {
            await audioElement.play();
            console.log("Audio playing for:", remotePlayerId);
          } catch (err: any) {
            console.warn("Audio play failed, retrying:", err.message);

            // Handle autoplay policy - Firefox sometimes needs user interaction
            if (
              err.name === "NotAllowedError" ||
              err.name === "NotSupportedError"
            ) {
              // Retry with exponential backoff
              const retryDelays = [500, 1000, 2000];

              for (const delay of retryDelays) {
                await new Promise((resolve) => setTimeout(resolve, delay));
                try {
                  await audioElement.play();
                  console.log(
                    "Audio play retry succeeded for:",
                    remotePlayerId
                  );
                  return; // Success, exit retry loop
                } catch (retryErr: any) {
                  console.warn(
                    `Retry after ${delay}ms failed:`,
                    retryErr.message
                  );
                }
              }

              // Final attempt failed
              console.error(
                "All audio play retries failed for:",
                remotePlayerId
              );

              // Optionally show user notification that they need to interact
              setAudioError(
                t("voiceChat.audioPlaybackFailed", {
                  player: remotePlayerId,
                }) || `Audio playback blocked. Click anywhere to enable.`
              );

              // Try to play on next user interaction
              const playOnInteraction = async () => {
                try {
                  await audioElement.play();
                  console.log(
                    "Audio playing after user interaction:",
                    remotePlayerId
                  );
                  setAudioError(null);
                  // Remove listeners after successful play
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

        playAudio();
      };

      pc.onnegotiationneeded = async () => {
        try {
          console.log("Negotiation needed with:", remotePlayerId);
          // Use the ref instead of direct call
          if (createOfferRef.current) {
            await createOfferRef.current(remotePlayerId);
          }
        } catch (error) {
          console.error("Error in negotiation:", error);
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

        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          console.log(`Attempting to reconnect to ${remotePlayerId}`);
          // Attempt to reconnect
          setTimeout(() => {
            if (pc.connectionState !== "connected" && createOfferRef.current) {
              createOfferRef.current(remotePlayerId);
            }
          }, 3000);
        }
      };

      // Log ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log(
          `ICE connection state with ${remotePlayerId}:`,
          pc.iceConnectionState
        );
      };

      peerConnectionsRef.current.set(remotePlayerId, { connection: pc });
      return pc;
    },
    [sendMessage, mutedPlayers, ensureAudioContextRunning, t] // Removed createOffer dependency
  );

  // Create and send offer to a remote player
  const createOffer = useCallback(
    async (remotePlayerId: string) => {
      const peerData = peerConnectionsRef.current.get(remotePlayerId);
      if (!peerData) {
        console.warn("No peer connection found for:", remotePlayerId);
        return;
      }

      const pc = peerData.connection;

      // Don't create offer if we're already in a stable state with remote description
      if (
        pc.signalingState !== "stable" &&
        pc.signalingState !== "have-local-offer"
      ) {
        console.log("Skipping offer, signaling state is:", pc.signalingState);
        return;
      }

      try {
        // Remove deprecated options - adapter.js will handle this
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendMessage({
          type: "RTC_OFFER",
          payload: {
            targetPlayerId: remotePlayerId,
            signal: offer,
          },
        });
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    },
    [sendMessage]
  );

  // Update the ref whenever createOffer changes
  useEffect(() => {
    createOfferRef.current = createOffer;
  }, [createOffer]);

  // Handle incoming offer
  const handleOffer = useCallback(
    async (fromPlayerId: string, offer: RTCSessionDescriptionInit) => {
      let pc = peerConnectionsRef.current.get(fromPlayerId)?.connection;

      // If connection exists but in wrong state, close and recreate
      if (pc && pc.signalingState !== "stable") {
        console.log("Closing existing connection in state:", pc.signalingState);
        pc.close();
        pc = createPeerConnection(fromPlayerId);
      } else if (!pc) {
        pc = createPeerConnection(fromPlayerId);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Add any pending ICE candidates
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
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendMessage({
          type: "RTC_ANSWER",
          payload: {
            targetPlayerId: fromPlayerId,
            signal: answer,
          },
        });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    },
    [createPeerConnection, sendMessage]
  );

  // Handle incoming answer
  const handleAnswer = useCallback(
    async (fromPlayerId: string, answer: RTCSessionDescriptionInit) => {
      const peerConn = peerConnectionsRef.current.get(fromPlayerId);
      if (!peerConn) return;

      try {
        await peerConn.connection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        // Add any pending ICE candidates
        const pendingCandidates =
          pendingCandidatesRef.current.get(fromPlayerId) || [];
        for (const candidate of pendingCandidates) {
          await peerConn.connection.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current.delete(fromPlayerId);
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    },
    []
  );

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(
    async (fromPlayerId: string, candidate: RTCIceCandidateInit) => {
      const peerConn = peerConnectionsRef.current.get(fromPlayerId);

      if (!peerConn) {
        // Store candidate for later if peer connection doesn't exist yet
        const pending = pendingCandidatesRef.current.get(fromPlayerId) || [];
        pending.push(new RTCIceCandidate(candidate));
        pendingCandidatesRef.current.set(fromPlayerId, pending);
        console.log("Stored ICE candidate for later:", fromPlayerId);
        return;
      }

      try {
        // Only add if we have remote description AND signaling state is appropriate
        if (
          peerConn.connection.remoteDescription &&
          peerConn.connection.signalingState !== "closed"
        ) {
          await peerConn.connection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
          console.log("Added ICE candidate from:", fromPlayerId);
        } else {
          // Store for later
          const pending = pendingCandidatesRef.current.get(fromPlayerId) || [];
          pending.push(new RTCIceCandidate(candidate));
          pendingCandidatesRef.current.set(fromPlayerId, pending);
          console.log(
            "Stored ICE candidate (no remote desc yet):",
            fromPlayerId
          );
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    },
    []
  );

  // Enable voice chat
  const enableVoiceChat = useCallback(async () => {
    if (isVoiceEnabled) return;

    const stream = await initializeAudio();
    if (!stream) return;

    setIsVoiceEnabled(true);
    sessionStorage.setItem("voiceChatEnabled", "true");

    // Wait longer for WebSocket to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create connections to all other players (except bots)
    const otherPlayers = players.filter(
      (p) => p.id !== localPlayerId && !p.isBot && p.isConnected
    );

    // Create connections sequentially with small delays (more reliable)
    for (const player of otherPlayers) {
      await createOffer(player.id);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay between offers
    }
  }, [isVoiceEnabled, initializeAudio, players, localPlayerId, createOffer]);

  // Disable voice chat
  const disableVoiceChat = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Clean up audio analysis
    animationFramesRef.current.forEach((frameId) =>
      cancelAnimationFrame(frameId)
    );
    animationFramesRef.current.clear();

    audioContextsRef.current.forEach((ctx) => {
      if (ctx.state !== "closed") {
        ctx.close();
      }
    });
    audioContextsRef.current.clear();

    analysersRef.current.clear();
    setAudioLevels(new Map());

    // Close all peer connections and stop audio elements
    peerConnectionsRef.current.forEach((peerConn) => {
      if (peerConn.audioElement) {
        peerConn.audioElement.pause();
        peerConn.audioElement.srcObject = null;
        // Remove from DOM if attached
        if (peerConn.audioElement.parentNode) {
          peerConn.audioElement.parentNode.removeChild(peerConn.audioElement);
        }
      }
      peerConn.connection.close();
    });
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

    setIsVoiceEnabled(false);
    sessionStorage.removeItem("voiceChatEnabled");
    setIsMuted(false);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current || hostMuted) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, [hostMuted]);

  // Mute/unmute specific player (local only - affects what you hear)
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

  // Host kicks a player
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

  // Host mutes a player's microphone (server-side enforcement)
  const mutePlayerMic = useCallback(
    (playerId: string, mute: boolean) => {
      if (!isHost) return;

      sendMessage({
        type: "SWITCH_PLAYER_MIC",
        payload: { playerId, mute },
      });

      // Optimistically update UI - server will confirm
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

        // Update host's tracking of muted players
        if (isHost) {
          setHostMutedPlayers((prev) => {
            const newSet = new Set(prev);
            if (mute) {
              newSet.add(playerId);
            } else {
              newSet.delete(playerId);
            }
            return newSet;
          });
        }

        // If we're the one being muted/unmuted by host
        if (playerId === localPlayerId) {
          setHostMuted(mute);

          if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = !mute; // Disable track if muted by host
              setIsMuted(mute);

              // Show toast notification
              if (mute) {
                toast.warning(t("voiceChat.hostMutedYou"));
              } else {
                toast.success(t("voiceChat.hostUnmutedYou"));
              }
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
          // If we're the one being kicked, clean up and disable voice
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
  ]);

  // Handle new players joining
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

    // Clean up connections for players who left
    currentPeerIds.forEach((peerId) => {
      const playerExists = activePlayers.some((p) => p.id === peerId);
      if (!playerExists) {
        const peerConn = peerConnectionsRef.current.get(peerId);
        if (peerConn) {
          if (peerConn.audioElement) {
            peerConn.audioElement.pause();
            peerConn.audioElement.srcObject = null;
            // Remove from DOM if attached
            if (peerConn.audioElement.parentNode) {
              peerConn.audioElement.parentNode.removeChild(
                peerConn.audioElement
              );
            }
          }
          peerConn.connection.close();
          peerConnectionsRef.current.delete(peerId);
        }

        // Clean up audio analysis
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

  // Auto-reconnect voice chat if it was enabled before page transition
  useEffect(() => {
    if (wasVoiceEnabled && !isVoiceEnabled && players.length > 0) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        enableVoiceChat();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [wasVoiceEnabled, isVoiceEnabled, players.length, enableVoiceChat]);

  return {
    isVoiceEnabled,
    isMuted,
    audioError,
    mutedPlayers,
    hostMutedPlayers,
    hostMuted,
    isHost,
    audioLevels,
    enableVoiceChat,
    disableVoiceChat,
    toggleMute,
    togglePlayerMute,
    kickPlayer,
    mutePlayerMic,
  };
}
