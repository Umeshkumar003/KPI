import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar(props: CalendarProps) {
  return <DayPicker {...props} />
}

Calendar.displayName = "Calendar"

export { Calendar }
