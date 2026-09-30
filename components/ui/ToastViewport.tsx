import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Check, CircleAlert, LoaderCircle, X } from 'lucide-react';
import { toast, toastStore, type ToastItem } from '../../lib/toast';

function Notification({ item }: { item: ToastItem }) {
  const phase = item.phase ?? 0;
  return <div className="app-toast" data-kind={item.kind}>
    {item.kind === 'progress' ? <LoaderCircle size={17} className="app-toast-spinner" aria-hidden="true" /> : item.kind === 'error' ? <CircleAlert size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
    <div className="app-toast-content">
      {item.kind === 'error' ? <>
        <span className="app-toast-label">{item.message}</span>
        <span className="app-toast-code">{item.code}</span>
      </> : <>
        <span className="app-toast-label">{item.kind === 'success' ? item.message : item.title || item.message}</span>
        {item.phases && <>
          {item.kind === 'progress' && <div className="app-toast-phase">Step {phase + 1} of {item.phases.length}: {item.phases[phase]}</div>}
          <div className="app-toast-bar" role="progressbar" aria-label={`${item.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percent} aria-valuetext={item.kind === 'success' ? 'Done' : `Step ${phase + 1}: ${item.phases[phase]}`}>
            <div style={{ width: `${item.percent}%` }} />
          </div>
        </>}
      </>}
    </div>
    {item.kind !== 'progress' && <button type="button" className="app-toast-dismiss" aria-label={`Dismiss ${item.title || 'notification'}`} onClick={() => toast.dismiss(item.id)}><X size={16} /></button>}
  </div>;
}

export default function ToastViewport() {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
  const hasAction = items.some(item => !item.request && item.kind === 'progress');
  const visible = items.filter(item => !hasAction || !item.request || item.kind === 'error');
  return createPortal(<div className="app-toast-viewport" data-toast-root="true" aria-label="Notifications">
    <div role="status" aria-live="polite">{visible.filter(item => item.kind !== 'error').map(item => <Notification item={item} key={item.id} />)}</div>
    <div role="alert" aria-live="assertive">{visible.filter(item => item.kind === 'error').map(item => <Notification item={item} key={item.id} />)}</div>
  </div>, document.body);
}
