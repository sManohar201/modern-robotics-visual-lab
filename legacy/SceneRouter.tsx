import { PlaceholderScene } from "./scenes/PlaceholderScene";
import { CspaceScene } from "./scenes/Chapter2/CspaceScene";
import { SO3Scene } from "./scenes/Chapter3/SO3Scene";
import { SE3Scene } from "./scenes/Chapter3/SE3Scene";
import { TwistScene } from "./scenes/Chapter3/TwistScene";
import { JacobianScene } from "./scenes/Chapter5/JacobianScene";
import { POEScene } from "./scenes/Chapter4/POEScene";

interface SceneRouterProps {
  chapter: string;
  topic: string;
}

export function SceneRouter({ chapter, topic }: SceneRouterProps) {
  if (chapter === "chapter2") {
    if (topic === "cspace-intro") return <CspaceScene />;
  }

  if (chapter === "chapter3") {
    if (topic === "rotation-so3") return <SO3Scene />;
    if (topic === "homog-se3") return <SE3Scene />;
    if (topic === "twists") return <TwistScene />;
  }

  if (chapter === "chapter4") {
    if (topic === "poe-space") return <POEScene />;
  }

  if (chapter === "chapter5") {
    if (topic === "space-jacobian") return <JacobianScene />;
  }

  return <PlaceholderScene chapter={chapter} topic={topic} />;
}
