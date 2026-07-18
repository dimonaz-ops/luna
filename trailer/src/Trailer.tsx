import { Audio, Video } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const NEON = "#27e8ff";
const GOLD = "#ffd257";
const BG = "#030612";
const MONO = '"Lucida Console", Monaco, "Courier New", monospace';

const ease = Easing.bezier(0.16, 1, 0.3, 1);

// Deterministic starfield so every render is identical.
const STARS = Array.from({ length: 140 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: r(1) * 100, y: r(2) * 100, s: 1 + r(3) * 2.5, o: 0.25 + r(4) * 0.6 };
});

const Starfield: React.FC<{ speed?: number }> = ({ speed = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #0a1630 0%, ${BG} 70%)` }}>
      {STARS.map((st, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${st.x}%`,
            top: `${(st.y + frame * 0.02 * speed * st.s) % 104}%`,
            width: st.s,
            height: st.s,
            borderRadius: "50%",
            background: "#cfeefe",
            opacity: st.o,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
      pointerEvents: "none",
    }}
  />
);

const SceneFade: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({
  children,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity:
          interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
          interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const NeonText: React.FC<{ children: string; size: number; color?: string; spacing?: string }> = ({
  children,
  size,
  color = NEON,
  spacing = "0.3em",
}) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: size,
      color,
      letterSpacing: spacing,
      textShadow: `0 0 24px ${color}, 0 0 90px ${color}66`,
      textAlign: "center",
      paddingLeft: spacing, // compensate trailing letter-spacing so text centers optically
    }}
  >
    {children}
  </div>
);

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const letters = "LUNA".split("");
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", gap: "0.25em", fontFamily: MONO }}>
        {letters.map((ch, i) => (
          <div
            key={i}
            style={{
              fontSize: 220,
              color: NEON,
              textShadow: `0 0 30px ${NEON}, 0 0 120px ${NEON}88`,
              opacity: interpolate(frame, [8 + i * 7, 22 + i * 7], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease,
              }),
              scale: String(
                interpolate(frame, [8 + i * 7, 26 + i * 7], [2.2, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: ease,
                }),
              ),
            }}
          >
            {ch}
          </div>
        ))}
      </div>
      <div
        style={{
          opacity: interpolate(frame, [55, 75], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
          translate: `0px ${interpolate(frame, [55, 75], [30, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          })}px`,
        }}
      >
        <NeonText size={54} color="#6fa8bd" spacing="0.6em">
          3D SPACE INVADERS
        </NeonText>
      </div>
    </AbsoluteFill>
  );
};

const Clip: React.FC<{
  src: string;
  trimBeforeSec: number;
  caption: string;
  durationInFrames: number;
}> = ({ src, trimBeforeSec, caption, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Video
        src={staticFile(src)}
        muted
        trimBefore={Math.round(trimBeforeSec * fps)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          scale: String(
            interpolate(frame, [0, durationInFrames], [1.04, 1.14], { easing: Easing.linear }),
          ),
        }}
      />
      <Vignette />
      {caption === "" ? null : (
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 110 }}>
        <div
          style={{
            opacity:
              interpolate(frame, [14, 30], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease,
              }) *
              interpolate(frame, [durationInFrames - 24, durationInFrames - 8], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            translate: `0px ${interpolate(frame, [14, 30], [26, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease,
            })}px`,
            background: "rgba(3, 6, 18, 0.72)",
            border: `1px solid ${NEON}55`,
            borderRadius: 12,
            padding: "26px 60px",
          }}
        >
          <NeonText size={58} spacing="0.35em">
            {caption}
          </NeonText>
        </div>
      </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{ title: string; sub: string; accent?: string }> = ({
  title,
  sub,
  accent = NEON,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Starfield speed={4} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 44 }}>
        <div
          style={{
            scale: String(
              interpolate(frame, [0, 22], [0.7, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease,
              }),
            ),
            opacity: interpolate(frame, [0, 14], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <NeonText size={100} color={accent}>
            {title}
          </NeonText>
        </div>
        <div
          style={{
            opacity: interpolate(frame, [16, 32], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease,
            }),
          }}
        >
          <NeonText size={44} color="#6fa8bd" spacing="0.5em">
            {sub}
          </NeonText>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 9) * 0.03;
  return (
    <AbsoluteFill>
      <Starfield speed={2} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 48 }}>
        <div
          style={{
            opacity: interpolate(frame, [0, 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease,
            }),
          }}
        >
          <NeonText size={170} spacing="0.35em">
            LUNA
          </NeonText>
        </div>
        <div
          style={{
            scale: String(pulse),
            opacity: interpolate(frame, [22, 40], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease,
            }),
            border: `2px solid ${GOLD}`,
            borderRadius: 12,
            padding: "24px 70px",
            boxShadow: `0 0 40px ${GOLD}55`,
          }}
        >
          <NeonText size={64} color={GOLD}>
            PLAY NOW
          </NeonText>
        </div>
        <div
          style={{
            opacity: interpolate(frame, [40, 58], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease,
            }),
          }}
        >
          <NeonText size={40} color="#6fa8bd" spacing="0.2em">
            luna-space-invaders.netlify.app
          </NeonText>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const SCENES = {
  intro: 105,
  scout: 240,
  card1: 90,
  shop: 240,
  card2: 90,
  dread: 150,
  outro: 195,
};

export const TOTAL_FRAMES =
  SCENES.intro + SCENES.scout + SCENES.card1 + SCENES.shop + SCENES.card2 + SCENES.dread + SCENES.outro;

export const Trailer: React.FC = () => {
  let at = 0;
  const seq = (len: number) => {
    const from = at;
    at += len;
    return { from, durationInFrames: len };
  };
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("music.wav")} volume={0.85} name="Music" />

      <Sequence name="Intro" {...seq(SCENES.intro)}>
        <SceneFade durationInFrames={SCENES.intro}>
          <Starfield />
          <Intro />
        </SceneFade>
      </Sequence>

      <Sequence name="Scout gameplay" {...seq(SCENES.scout)}>
        <SceneFade durationInFrames={SCENES.scout}>
          <Clip
            src="scout.webm"
            trimBeforeSec={3.4}
            caption="DEFEND THE LINE"
            durationInFrames={SCENES.scout}
          />
        </SceneFade>
      </Sequence>

      <Sequence name="Card: arsenal" {...seq(SCENES.card1)}>
        <SceneFade durationInFrames={SCENES.card1}>
          <TitleCard title="UPGRADE YOUR ARSENAL" sub="FIVE WEAPON TRACKS" />
        </SceneFade>
      </Sequence>

      <Sequence name="Shop" {...seq(SCENES.shop)}>
        <SceneFade durationInFrames={SCENES.shop}>
          <Clip
            src="shop.webm"
            trimBeforeSec={1.4}
            caption=""
            durationInFrames={SCENES.shop}
          />
        </SceneFade>
      </Sequence>

      <Sequence name="Card: ships" {...seq(SCENES.card2)}>
        <SceneFade durationInFrames={SCENES.card2}>
          <TitleCard title="BUY BIGGER SHIPS" sub="FOUR HULLS. ONE MISSION." accent={GOLD} />
        </SceneFade>
      </Sequence>

      <Sequence name="Dreadnought gameplay" {...seq(SCENES.dread)}>
        <SceneFade durationInFrames={SCENES.dread}>
          <Clip
            src="dreadnought.webm"
            trimBeforeSec={1.7}
            caption="UNLEASH THE DREADNOUGHT"
            durationInFrames={SCENES.dread}
          />
        </SceneFade>
      </Sequence>

      <Sequence name="Outro" {...seq(SCENES.outro)}>
        <SceneFade durationInFrames={SCENES.outro}>
          <Outro />
        </SceneFade>
      </Sequence>
    </AbsoluteFill>
  );
};
