import { useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const INDIAN_CITIES = [
  "Agra", "Ahmedabad", "Ajmer", "Allahabad", "Amritsar", "Aurangabad", "Bengaluru", "Bhopal",
  "Bhubaneswar", "Chandigarh", "Chennai", "Coimbatore", "Dehradun", "Delhi", "Dhanbad", "Faridabad",
  "Ghaziabad", "Goa", "Gurugram", "Guwahati", "Gwalior", "Howrah", "Hubli", "Hyderabad", "Indore",
  "Jabalpur", "Jaipur", "Jalandhar", "Jammu", "Jamshedpur", "Jodhpur", "Kanpur", "Kochi", "Kolhapur",
  "Kolkata", "Kota", "Kozhikode", "Lucknow", "Ludhiana", "Madurai", "Mangaluru", "Meerut", "Mumbai",
  "Mysuru", "Nagpur", "Nashik", "Navi Mumbai", "Noida", "Patna", "Puducherry", "Pune", "Raipur",
  "Rajkot", "Ranchi", "Salem", "Shimla", "Srinagar", "Surat", "Thane", "Thiruvananthapuram",
  "Tiruchirappalli", "Udaipur", "Vadodara", "Varanasi", "Vijayawada", "Visakhapatnam", "Warangal",
];

export function CityPicker({
  value, onChange, placeholder = "Select city", allowClear = false, id, className,
}: {
  value?: string | null;
  onChange: (city: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const list = value && !INDIAN_CITIES.includes(value) ? [value, ...INDIAN_CITIES] : INDIAN_CITIES;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}>
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search city..." />
          <CommandList>
            <CommandEmpty>No city found.</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem value="__all" onSelect={() => { onChange(""); setOpen(false); }}>
                  All cities
                </CommandItem>
              )}
              {list.map((c) => (
                <CommandItem key={c} value={c} onSelect={() => { onChange(c); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === c ? "opacity-100" : "opacity-0")} />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
