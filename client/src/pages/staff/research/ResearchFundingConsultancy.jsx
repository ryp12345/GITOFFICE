import TabbedResearchModule from './TabbedResearchModule';

// Laravel rendered funded projects and consultancies as two tables under one menu.
export default function ResearchFundingConsultancy() {
  return (
    <TabbedResearchModule
      title="Funding and Consultancy"
      subtitle="Funded projects and consultancies"
      modulePath="/teaching/research/funding-consultancy"
      tabs={[
        { resource: 'funded-project', label: 'Funded Project Details' },
        { resource: 'consultancy', label: 'Consultancy Details' },
      ]}
    />
  );
}