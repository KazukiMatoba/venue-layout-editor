import type { TableObject, TextBoxProps } from '../types';

interface TextBoxToolbarProps {
    onCreateTextBox: (props: TextBoxProps) => void;
    selectedTextBox?: TableObject | null;
    onUpdateTextBox: (id: string, props: Partial<TextBoxProps>) => void;
}

