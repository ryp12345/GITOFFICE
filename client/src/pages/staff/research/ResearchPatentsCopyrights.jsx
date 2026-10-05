import TabbedResearchModule from './TabbedResearchModule';

// Laravel rendered copyrights and patents as two tables under one menu.
export default function ResearchPatentsCopyrights() {
  return (
    <TabbedResearchModule
      title="Copyrights and Patents"
      subtitle="Patents and copyrights"
      modulePath="/teaching/research/copyright-patents"
      tabs={[
        { resource: 'patent', label: 'Patent Details' },
        { resource: 'copyright', label: 'Copyright Details' },
      ]}
    />
  );
}