import { TrainingResourceLink } from "./tripPageShared";

export default function TripTrainingResourcesLayout({
  requiredTrainingResources = [],
  optionalTrainingResources = [],
}) {
  return (
    <div className="tripTrainingResourcesColumns">
      <div className="tripTrainingResourcesColumn">
        <div className="small tripTrainingResourcesColumnHeading">Required training</div>
        <div className="tripTrainingResourcesStack">
          {requiredTrainingResources.map((resource) => (
            <TrainingResourceLink key={resource.id} resource={resource} />
          ))}
        </div>
      </div>

      <div className="tripTrainingResourcesColumn">
        <div className="small tripTrainingResourcesColumnHeading">Optional</div>
        <div className="tripTrainingResourcesStack">
          {optionalTrainingResources.map((resource) => (
            <TrainingResourceLink key={resource.id} resource={resource} />
          ))}
        </div>
      </div>
    </div>
  );
}
