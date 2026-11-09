import * as Select from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import './CustomSelect.css';

export interface SelectOption { value: string; label: string; group?: string }
export function CustomSelect({ id, value, onChange, options, placeholder = 'Choose an option', disabled = false }: {
  id: string; value: string; onChange: (value: string) => void;
  options: SelectOption[]; placeholder?: string; disabled?: boolean;
}) {
  const groups = [...new Set(options.map(option => option.group ?? ''))];
  return <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
    <Select.Trigger id={id} className="custom-select-trigger">
      <Select.Value placeholder={placeholder}/>
      <Select.Icon className="custom-select-chevron"><ChevronDownIcon width={16} height={16}/></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="custom-select-menu" position="popper" align="start" sideOffset={6} collisionPadding={12}>
        <Select.ScrollUpButton className="custom-select-scroll" aria-label="Scroll options up"><ChevronUpIcon/></Select.ScrollUpButton>
        <Select.Viewport className="custom-select-viewport">{groups.map((group, index) => <div key={group}>
          {index > 0 && <Select.Separator className="custom-select-separator"/>}
          <Select.Group>
            {group && <Select.Label className="custom-select-group">{group}</Select.Label>}
            {options.filter(option => (option.group ?? '') === group).map(option => <Select.Item className="custom-select-option" key={option.value} value={option.value} title={option.label}>
              <Select.ItemText><span className="custom-select-label">{option.label}</span></Select.ItemText>
              <Select.ItemIndicator className="custom-select-check"><CheckIcon width={15} height={15}/></Select.ItemIndicator>
            </Select.Item>)}
          </Select.Group>
        </div>)}</Select.Viewport>
        <Select.ScrollDownButton className="custom-select-scroll" aria-label="Scroll options down"><ChevronDownIcon/></Select.ScrollDownButton>
      </Select.Content>
    </Select.Portal>
  </Select.Root>;
}
