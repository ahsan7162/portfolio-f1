import type { ReactNode } from 'react';
import type { Project } from '@/content/data';
import { AgentsScene } from './scenes/AgentsScene';
import { LlmScene } from './scenes/LlmScene';
import { OpsScene } from './scenes/OpsScene';

const SCENES: Record<Project['id'], () => ReactNode> = { agents: AgentsScene, 'partner-ops': OpsScene, 'llm-server': LlmScene };

/** A featured project's card visual: a small scene of the product in use. */
export function ProjectVisual({ project }: { project: Project }) {
  const S = SCENES[project.id];
  return <div aria-hidden="true" className="h-full w-full"><S /></div>;
}
