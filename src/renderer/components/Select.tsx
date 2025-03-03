import React from 'react';
import { Listbox } from '@headlessui/react';
import { HiChevronDown } from 'react-icons/hi';

type SelectOption = {
    value: string;
    label: string;
};

interface SelectProps {
    value?: SelectOption;
    onChange: (option: SelectOption) => void;
    options: SelectOption[];
}

export function Select({ value, onChange, options }: SelectProps) {
    return (
        <div className='relative w-full max-w-xs min-w-[200px]'>
            <Listbox value={value} onChange={onChange}>
                <div className='relative'>
                    <Listbox.Button
                        className="flex w-full items-center justify-between border border-gray-300 dark:border-gray-700 
                        rounded-lg bg-white dark:bg-gray-800 px-4 py-2 text-gray-700 dark:text-gray-200 shadow-sm 
                        hover:bg-gray-100 dark:hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <span>{value?.label || 'Select an option'}</span>
                        <HiChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                    </Listbox.Button>
                    <Listbox.Options
                        className="absolute mt-2 w-full min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                        rounded-lg shadow-lg overflow-hidden z-10 transition-all"
                    >
                        {options.map((option) => (
                            <Listbox.Option
                                key={option.value}
                                value={option}
                                className={({ active, selected }) => 
                                    `px-4 py-2 cursor-pointer transition-all ${
                                        active ? 'bg-blue-100 dark:bg-blue-900' : ''
                                    } ${selected ? 'font-semibold text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`
                                }
                            >
                                {option.label}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </div>
            </Listbox>
        </div>
    );
}
