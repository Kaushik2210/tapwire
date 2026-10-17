import React from "react";
import { Audio, Composition, Sequence, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import narration from "../narration.json";
import { S1, S2, S3, S4, S5, S6, S7, S8, type SceneProps } from "./scenes";
import { Background, Captions, fade } from "./ui";
import { FPS, LEAD_SECONDS, TAIL_SECONDS } from "./theme";
import { useCurrentFrame } from "remotion";

type SceneDef = { id: string; audio: string; design: number; Component: React.FC<SceneProps> };

// `design` is the narration length (seconds) each scene's beats were timed against; scenes scale to the real clip.
const SCENES: SceneDef[] = [
  { id: "01-hook", audio: "audio/01-hook.mp3", design: 16.24, Component: S1 },
  { id: "02-intro", audio: "audio/02-intro.mp3", design: 12.08, Component: S2 },
  { id: "03-capture", audio: "audio/03-capture.mp3", design: 23.04, Component: S3 },
  { id: "04-agent", audio: "audio/04-agent.mp3", design: 27.28, Component: S4 },
  { id: "05-commit", audio: "audio/05-commit.mp3", design: 10.88, Component: S5 },
  { id: "06-dashboard", audio: "audio/06-dashboard.mp3", design: 17.0, Component: S6 },
  { id: "07-try", audio: "audio/07-try.mp3", design: 8.16, Component: S7 },
  { id: "08-close", audio: "audio/08-close.mp3", design: 16.64, Component: S8 },
];

type Timing = { id: string; frames: number; audioFrames: number; scale: number; hasAudio: boolean };
type Props = { timings: Timing[] };

const textFor = (id: string) => (narration.scenes.find((s) => s.id === id)?.text ?? "");

const SceneShell: React.FC<{ def: SceneDef; timing: Timing }> = ({ def, timing }) => {
  const frame = useCurrentFrame();
  const { Component } = def;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade(frame, timing.frames, 9) }}>
      <Component frames={timing.frames} scale={timing.scale} hasAudio={timing.hasAudio} />
      <Captions text={textFor(def.id)} start={Math.round(LEAD_SECONDS * FPS)} durationFrames={timing.audioFrames} />
      {timing.hasAudio ? (
        <Sequence from={Math.round(LEAD_SECONDS * FPS)}>
          <Audio src={staticFile(def.audio)} />
        </Sequence>
      ) : null}
    </div>
  );
};

const TapWire: React.FC<Props> = ({ timings }) => {
  let from = 0;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#0c0c0e" }}>
      <Background />
      {SCENES.map((def, i) => {
        const timing = timings[i];
        const node = (
          <Sequence key={def.id} from={from} durationInFrames={timing.frames}>
            <SceneShell def={def} timing={timing} />
          </Sequence>
        );
        from += timing.frames;
        return node;
      })}
    </div>
  );
};

async function audioSeconds(file: string): Promise<number | null> {
  try {
    return await getAudioDurationInSeconds(staticFile(file));
  } catch {
    return null; // the clip has not been generated yet
  }
}

export const Root: React.FC = () => (
  <Composition
    id="TapWire"
    component={TapWire}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={FPS * 150}
    defaultProps={{ timings: [] as Timing[] }}
    calculateMetadata={async () => {
      const timings: Timing[] = [];
      for (const s of SCENES) {
        const secs = await audioSeconds(s.audio);
        const hasAudio = secs !== null;
        const narr = secs ?? s.design; // a scene without audio plays at its design length
        timings.push({
          id: s.id,
          frames: Math.round((narr + LEAD_SECONDS + TAIL_SECONDS) * FPS),
          audioFrames: Math.round(narr * FPS),
          scale: narr / s.design,
          hasAudio,
        });
      }
      return { durationInFrames: timings.reduce((n, t) => n + t.frames, 0), props: { timings } };
    }}
  />
);
