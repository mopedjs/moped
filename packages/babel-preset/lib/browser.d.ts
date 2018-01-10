declare const config: {
    presets: (string | (string | {
        targets: {
            ie: number;
            uglify: boolean;
        };
        useBuiltIns: boolean;
        modules: boolean;
    })[])[];
    plugins: (string | [string, any])[];
};
export default config;
