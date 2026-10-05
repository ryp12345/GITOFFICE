import { useState } from 'react';

import ResearchModule from './ResearchModule';

// Funding & Consultancy, Copyrights & Patents and Conference each pair two Laravel pages that
// shared one menu entry. The wrapper only owns the tab bar and the active resource; the page
// chrome (Header, sidebar, search, table, modal) stays inside ResearchModule.
export default function TabbedResearchModule({ tabs, title, subtitle, modulePath }) {
  const [activeResource, setActiveResource] = useState(tabs[0].resource);

  return (
    <ResearchModule
      resource={activeResource}
      title={title}
      subtitle={subtitle}
      modulePath={modulePath}
      tabs={{ items: tabs, activeResource, onSelect: setActiveResource }}
    />
  );
}