declare const _default: {
    presets: (string | (string | {
        targets: {
            ie: number;
            uglify: boolean;
        };
        useBuiltIns: boolean;
        modules: boolean;
    })[])[];
    plugins: (string | [string, any])[];
} | {
    presets: (string | (string | {
        targets: {
            node: string;
        };
    })[])[];
    plugins: (string | [string, any])[];
};
export default _default;
