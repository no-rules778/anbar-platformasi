import { Button } from '../ui/Button'

/* Edit-mode banner — M7-110, index.html:3727-3732.

   The banner exists to state the one fact the screen cannot show: the
   correction has NOT touched the database yet. Without it a user who abandons
   the tab believes the document is already changed. */
interface Props {
  docNum: string
  onExit: () => void
}

export function EditModeBanner({ docNum, onExit }: Props) {
  return (
    <div className="notice" data-testid="edit-mode-banner">
      <span>
        <b>{docNum}</b> sənədi düzəliş rejimindədir — bazada hələ heç nə dəyişməyib.
      </span>
      <Button variant="secondary" size="sm" onClick={onExit}>Düzəlişdən imtina</Button>
    </div>
  )
}
