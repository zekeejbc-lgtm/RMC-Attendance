import { Composition, Folder } from "remotion";
import { ProductExplainer } from "./Composition";
import { Problem } from "./scenes/Problem";
import { Agitation } from "./scenes/Agitation";
import { Solution } from "./scenes/Solution";
import { Features } from "./scenes/Features";
import { Benefits } from "./scenes/Benefits";
import { CTA } from "./scenes/CTA";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="IARS-Explainer"
        component={ProductExplainer}
        durationInFrames={3600}
        fps={60}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="Problem"
          component={Problem}
          durationInFrames={504}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="Agitation"
          component={Agitation}
          durationInFrames={444}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="Solution"
          component={Solution}
          durationInFrames={624}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="Features"
          component={Features}
          durationInFrames={1044}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="Benefits"
          component={Benefits}
          durationInFrames={624}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="CTA"
          component={CTA}
          durationInFrames={480}
          fps={60}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
