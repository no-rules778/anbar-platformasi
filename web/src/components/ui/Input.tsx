import { type InputHTMLAttributes, forwardRef } from 'react'

/* Inputs are styled globally by the platform stylesheet (index.html:98-99),
   so this only forwards props and keeps a single place to add field
   behaviour later.

   M18-57 — `type` DEFAULTS to `text`. The platform stylesheet selects on the
   attribute, not on the element: `input[type=text],input[type=number],…`
   (index.css:129) carries the border, background, padding and width. A bare
   `<input>` has an IMPLIED text type but NO `type` attribute, so it matches
   none of those selectors and rendered unstyled — item search, «Müqavilə №»,
   «Qaimə №» and «Qeyd» all lost their field box. Legacy writes `type="text"`
   explicitly on every one of them (index.html:3275, 3286-3292).

   The default is applied by spreading `props` AFTER it, so an explicitly
   supplied `date` / `number` / `search` / `email` / `password` still wins. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => <input ref={ref} type="text" {...props} />,
)
Input.displayName = 'Input'
