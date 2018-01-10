declare const config: {
    presets: (string | (string | {
        targets: {
            ie: number;
            uglify: boolean;
        };
        useBuiltIns: boolean;
        modules: string;
    })[])[];
    plugins: (string | [string, any])[];
};
export default config;
