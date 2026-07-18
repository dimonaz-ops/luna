import { Composition } from "remotion";
import { TOTAL_FRAMES, Trailer } from "./Trailer";

export const MyComposition = () => {
  return (
    <Composition
      id="Trailer"
      component={Trailer}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
