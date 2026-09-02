import { type InputHTMLAttributes, forwardRef } from 'react'

/* Inputs are styled globally by the platform stylesheet (index.html:98-99),
   so this only forwards props and keeps a single place to add field
   behaviour later. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => <input ref={ref} {...props} />,
)
Input.displayName = 'Input'
