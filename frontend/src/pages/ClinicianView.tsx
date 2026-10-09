import { usePatientData } from '@/context/usePatientData';
import { ClinicianSearch } from '@/components/ClinicianSearch';
import { ResourceSheet } from '@/components/ResourceSheet';

export const ClinicianView: React.FC = () => {
  const { selectedResource, setSelectedResource } = usePatientData();

  return (
    <div className="flex flex-col gap-8 pb-16 animate-fade-up">
      <ClinicianSearch />

      {/* Resource Inspector Sheet */}
      <ResourceSheet
        resource={selectedResource}
        open={Boolean(selectedResource)}
        onOpenChange={(open) => {
          if (!open) setSelectedResource(null);
        }}
      />
    </div>
  );
};
