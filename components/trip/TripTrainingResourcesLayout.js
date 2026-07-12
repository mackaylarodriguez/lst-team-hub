import { TrainingResourceLink } from "./tripPageShared";

export default function TripTrainingResourcesLayout({
  requiredTrainingResources = [],
  optionalTrainingResources = [],
}) {
  return (
    <div className="tripTrainingResourcesStacked">
      <div>
        <div className="small tripTrainingResourcesColumnHeading">Required training</div>
        <div className="tripTrainingResourceGrid">
          {requiredTrainingResources.map((resource) => (
            <TrainingResourceLink key={resource.id} resource={resource} />
          ))}
        </div>
      </div>

      <div>
        <div className="small tripTrainingResourcesColumnHeading">Optional</div>
        <div className="tripTrainingOptionalGrid">
          {optionalTrainingResources.map((resource) => (
            <TrainingResourceLink key={resource.id} resource={resource} />
          ))}
        </div>
      </div>
    </div>
  );
}
