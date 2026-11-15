import SiteNav from "@/components/SiteNav";
import StatePanel, { LoadingBar } from "@/components/StatePanel";

/** Full-page loading / failure state shown while the NASA archive (backend) is being reached. */
export default function ArchiveState({
  active,
  hidePlayLink = false,
  failed,
  onRetry,
  onSaved,
}: {
  active?: "play" | "viewer" | "about";
  hidePlayLink?: boolean;
  failed: boolean;
  onRetry: () => void;
  onSaved: () => void;
}) {
  return (
    <div className="sd-page">
      <SiteNav active={active} hidePlayLink={hidePlayLink} />
      <main className="archive-state">
        {failed ? (
          <StatePanel
            label="02 / IMAGE FAILED"
            title="We could not load this image."
            role="alert"
            actions={
              <>
                <button type="button" className="btn btn-primary btn-w160" onClick={onRetry}>
                  Try again
                </button>
                <button type="button" className="btn btn-secondary btn-w216" onClick={onSaved}>
                  Play a saved level
                </button>
              </>
            }
          >
            Try the request again or continue with saved data.
          </StatePanel>
        ) : (
          <StatePanel label="01 / LOADING" title="Fetching image from the NASA archive" role="status">
            <div className="loading-skeleton" />
            <LoadingBar />
            <p className="state-note">A progress line shows that the request is still active.</p>
          </StatePanel>
        )}
      </main>
    </div>
  );
}
