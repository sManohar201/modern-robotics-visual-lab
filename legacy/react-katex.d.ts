declare module 'react-katex' {
    import * as React from 'react';
    export interface KatexProps {
        math: string;
        block?: boolean;
        errorColor?: string;
        renderError?: (error: any) => React.ReactNode;
    }
    export class InlineMath extends React.Component<KatexProps> {}
    export class BlockMath extends React.Component<KatexProps> {}
}
