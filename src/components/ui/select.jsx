import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const SelectContext = React.createContext(null)

const Select = ({ value, onValueChange, defaultValue, children }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const [open, setOpen] = React.useState(false)
  
  const currentValue = value !== undefined ? value : internalValue
  const handleValueChange = (newValue) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
  }

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectGroup = ({ children }) => <div>{children}</div>

const SelectValue = ({ placeholder, children }) => {
  const context = React.useContext(SelectContext)
  if (children) return <span>{children}</span>
  return <span>{context?.value || placeholder}</span>
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => context?.setOpen(!context?.open)}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}>
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const context = React.useContext(SelectContext)
  
  if (!context?.open) return null
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => context?.setOpen(false)} />
      <div
        ref={ref}
        className={cn(
          "absolute z-50 mt-1 max-h-96 min-w-[8rem] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          className
        )}
        {...props}>
        <div className="p-1 max-h-60 overflow-auto">
          {children}
        </div>
      </div>
    </>
  )
})
SelectContent.displayName = "SelectContent"

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = "SelectLabel"

const SelectItem = React.forwardRef(({ className, children, value, style, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  const isSelected = context?.value === value
  
  // Apply dark theme styles for selected/hover states if style prop exists
  const itemStyle = style ? {
    ...style,
    ...(isSelected && {
      background: 'rgba(16,185,129,0.12)',
      color: '#10b981',
      borderLeft: '2px solid #10b981',
    })
  } : {}
  
  return (
    <div
      ref={ref}
      onClick={() => context?.onValueChange(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      style={itemStyle}
      onMouseEnter={(e) => {
        if (style && !isSelected) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
          e.currentTarget.style.color = '#e2e8f0'
        }
      }}
      onMouseLeave={(e) => {
        if (style) {
          e.currentTarget.style.background = style.background || 'transparent'
          e.currentTarget.style.color = isSelected ? '#10b981' : (style.color || '#94a3b8')
        }
      }}
      {...props}>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" style={{ color: '#10b981' }} />}
      </span>
      {children}
    </div>
  )
})
SelectItem.displayName = "SelectItem"

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = "SelectSeparator"

const SelectScrollUpButton = () => null
const SelectScrollDownButton = () => null

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}