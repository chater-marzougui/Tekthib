import { useState, useEffect, useRef, useCallback } from "react";
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
  ],
};

export function useVoiceChat({
  localPlayerId,
  players,
  isHost = false,
}: VoiceChatConfig) {
  const { sendMessage, registerHandler } = useWebSocketContext();

  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(new Set());
  const [hostMutedPlayers, setHostMutedPlayers] = useState<Set<string>>(
    new Set(),
  );
  const [hostMuted, setHostMuted] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(
    new Map(),
  );
  const navigate = useNavigate();

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

  // Create peer connection for a remote player
  const createPeerConnection = useCallback(
    (remotePlayerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local stream tracks to the connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle incoming remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;

        // Update peer connection with the stream
        const peerConn = peerConnectionsRef.current.get(remotePlayerId);
        if (peerConn) {
          peerConn.stream = remoteStream;

          // Create audio element and play
          const audioElement = new Audio();
          audioElement.srcObject = remoteStream;
          audioElement.autoplay = true;

          // Check if this player is muted
          audioElement.volume = mutedPlayers.has(remotePlayerId) ? 0 : 1;

          // Store audio element for later mute control
          peerConn.audioElement = audioElement;

          audioElement.play().catch((err) => {
            console.error("Error playing remote audio:", err);
          });
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
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          // Attempt to reconnect
          setTimeout(() => {
            if (pc.connectionState !== "connected") {
              createOffer(remotePlayerId);
            }
          }, 3000);
        }
      };

      peerConnectionsRef.current.set(remotePlayerId, { connection: pc });
      return pc;
    },
    [sendMessage, mutedPlayers],
  );

  // Create and send offer to a remote player
  const createOffer = useCallback(
    async (remotePlayerId: string) => {
      const pc =
        peerConnectionsRef.current.get(remotePlayerId)?.connection ||
        createPeerConnection(remotePlayerId);

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
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    },
    [createPeerConnection, sendMessage],
  );

  // Handle incoming offer
  const handleOffer = useCallback(
    async (fromPlayerId: string, offer: RTCSessionDescriptionInit) => {
      const pc =
        peerConnectionsRef.current.get(fromPlayerId)?.connection ||
        createPeerConnection(fromPlayerId);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Add any pending ICE candidates
        const pendingCandidates =
          pendingCandidatesRef.current.get(fromPlayerId) || [];
        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(candidate);
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
    [createPeerConnection, sendMessage],
  );

  // Handle incoming answer
  const handleAnswer = useCallback(
    async (fromPlayerId: string, answer: RTCSessionDescriptionInit) => {
      const peerConn = peerConnectionsRef.current.get(fromPlayerId);
      if (!peerConn) return;

      try {
        await peerConn.connection.setRemoteDescription(
          new RTCSessionDescription(answer),
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
    [],
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
        return;
      }

      try {
        if (peerConn.connection.remoteDescription) {
          await peerConn.connection.addIceCandidate(
            new RTCIceCandidate(candidate),
          );
        } else {
          // Store for later if remote description isn't set yet
          const pending = pendingCandidatesRef.current.get(fromPlayerId) || [];
          pending.push(new RTCIceCandidate(candidate));
          pendingCandidatesRef.current.set(fromPlayerId, pending);
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    },
    [],
  );

  // Enable voice chat
  const enableVoiceChat = useCallback(async () => {
    if (isVoiceEnabled) return;

    const stream = await initializeAudio();
    if (!stream) return;

    setIsVoiceEnabled(true);

    // Create connections to all other players (except bots)
    const otherPlayers = players.filter(
      (p) => p.id !== localPlayerId && !p.isBot && p.isConnected,
    );

    for (const player of otherPlayers) {
      await createOffer(player.id);
    }
  }, [isVoiceEnabled, initializeAudio, players, localPlayerId, createOffer]);

  // Disable voice chat
  const disableVoiceChat = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections and stop audio elements
    peerConnectionsRef.current.forEach((peerConn) => {
      if (peerConn.audioElement) {
        peerConn.audioElement.pause();
        peerConn.audioElement.srcObject = null;
      }
      peerConn.connection.close();
    });
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

    setIsVoiceEnabled(false);
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
    [isHost, sendMessage],
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
    [isHost, sendMessage],
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
                toast.warning("Host has muted your microphone");
              } else {
                toast.success("Host has unmuted your microphone");
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
            toast.error("You have been kicked by the host");
            navigate("/");
          }
        }
      },
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
      (p) => p.id !== localPlayerId && !p.isBot && p.isConnected,
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
          }
          peerConn.connection.close();
          peerConnectionsRef.current.delete(peerId);
        }
      }
    });
  }, [players, localPlayerId, isVoiceEnabled, createOffer]);

  return {
    isVoiceEnabled,
    isMuted,
    audioError,
    mutedPlayers,
    hostMutedPlayers,
    hostMuted,
    isHost,
    enableVoiceChat,
    disableVoiceChat,
    toggleMute,
    togglePlayerMute,
    kickPlayer,
    mutePlayerMic,
  };
}
