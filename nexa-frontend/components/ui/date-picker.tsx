"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({ selected, onChange, minDate, maxDate }: {
  selected?: Date;
  onChange?: (date?: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const [open, setOpen] = React.useState(false);

  const formatDateForDisplay = (date: Date) => {
    // Format as YYYY-MM-DD to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-full h-12 justify-between font-normal border border-gray-300 rounded-xl px-4 text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all hover:border-gray-400"
          >
            {selected ? formatDateForDisplay(selected) : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            captionLayout="dropdown"
            fromDate={minDate}
            toDate={maxDate}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            onSelect={(date) => {
              setOpen(false);
              if (onChange) onChange(date);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
