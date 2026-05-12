declare module 'react-color' {
    import type { ComponentType } from 'react';

    export interface ColorResult {
        hex: string;
        rgb: {
            r: number;
            g: number;
            b: number;
            a?: number;
        };
    }

    export interface SketchPickerProps {
        color?: string;
        disableAlpha?: boolean;
        presetColors?: string[];
        width?: string;
        onChange?: (color: ColorResult) => void;
        onChangeComplete?: (color: ColorResult) => void;
    }

    export const SketchPicker: ComponentType<SketchPickerProps>;
}
