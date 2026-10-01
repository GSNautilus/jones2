/** The expansion picker the new game screen opens on the Jones 2 map: one checkbox per pack. */
import { Frame, FrameButton } from '../hud/Frame';
import { expansionChoices, toggleExpansion } from './expansions';

export function ExpansionsWindow({
  townId,
  chosen,
  onChange,
  onClose,
}: {
  townId: string;
  chosen: string[];
  onChange: (next: string[]) => void;
  onClose: () => void;
}) {
  return (
    <div className="hud-modal expansions-stage" onClick={onClose}>
      <Frame title="Expansions" className="hud-modal-card expansions-card">
        <div onClick={(e) => e.stopPropagation()}>
          <p className="hud-tagline">Each expansion opens some of the town's closed buildings.</p>
          {expansionChoices(townId).map((x) => (
            <label key={x.id} className="expansion-row">
              <input type="checkbox" checked={chosen.includes(x.id)} onChange={() => onChange(toggleExpansion(chosen, x.id))} />
              <span>
                <strong>{x.name}</strong>
                <span className="expansion-blurb">{x.blurb}</span>
              </span>
            </label>
          ))}
          <FrameButton onClick={onClose} className="setup-start">
            Done
          </FrameButton>
        </div>
      </Frame>
    </div>
  );
}
