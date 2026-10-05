import TabbedResearchModule from './TabbedResearchModule';

// Laravel exposed Conference as a single menu with two tables on one page.
export default function ResearchConference() {
  return (
    <TabbedResearchModule
      title="Conference"
      subtitle="Conferences attended and conducted"
      modulePath="/teaching/research/conference"
      tabs={[
        { resource: 'conference-attended', label: 'Conference Attended Details' },
        { resource: 'conference-conducted', label: 'Conference Conducted Details' },
      ]}
    />
  );
}