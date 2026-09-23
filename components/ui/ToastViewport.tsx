import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Check, CircleAlert, LoaderCircle } from 'lucide-react';
import { toastStore } from '../../lib/toast';

export default function ToastViewport() {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
  return createPortal(<div className="app-toast-viewport" data-toast-root="true" aria-label="Notifications">
    <div role="status" aria-live="polite" aria-atomic="true">{items.filter(item => item.kind !== 'error').map(item => <div className="app-toast" data-kind={item.kind} key={item.id}>
      {item.kind === 'progress' ? <LoaderCircle size={17} className="app-toast-spinner" aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
      <span><span className="app-toast-label">{item.kind === 'progress' ? 'In progress' : 'Success'}</span>{item.message}</span>
    </div>)}</div>
    <div role="alert" aria-live="assertive" aria-atomic="true">{items.filter(item => item.kind === 'error').map(item => <div className="app-toast" data-kind="error" key={item.id}>
      <CircleAlert size={17} aria-hidden="true" /><span><span className="app-toast-label">Failed <span className="app-toast-code">{item.code}</span></span>{item.message}</span>
    </div>)}</div>
  </div>, document.body);
}
