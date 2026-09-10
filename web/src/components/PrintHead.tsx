/* printHead (index.html:1238-1243) + the #printhead element (275).

   Hidden on screen, revealed by the print stylesheet. It is what makes a
   printed sheet self-describing: without it the page prints as an untitled,
   undated table with no indication of who produced it. */
interface Props {
  title: string
  /** The signed-in user's name — ME.name in the original. */
  userName: string
  /** Optional trailing note, appended after a separator. */
  note?: string
  /* WHEN the sheet was printed, not when the page was opened. The original
     builds the header inside the «Çap» handler, so `new Date()` is evaluated
     at print time (7167 calls printHead, which stamps, and only then prints).
     Computing it during render instead would date the sheet to the moment the
     page was opened — on a screen left open for hours, a wrong date. The
     caller therefore owns the stamp and sets it on click; `null` means the
     user has not printed yet, and the header stays undated exactly as the
     original's empty #printhead does before its first print. */
  stampedAt: Date | null
}

export function PrintHead({ title, userName, note, stampedAt }: Props) {
  /* `Anbar Platforması · <timestamp> · <user>[ · <note>]`, with the same
     az-AZ locale formatting the original uses. */
  return (
    <div id="printhead" className="printonly">
      <div className="ph-t">{title}</div>
      {stampedAt && (
        <div className="ph-s">
          Anbar Platforması · {stampedAt.toLocaleString('az-AZ')} · {userName}{note ? ` · ${note}` : ''}
        </div>
      )}
    </div>
  )
}
