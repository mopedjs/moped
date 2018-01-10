declare const config: {
    presets: (string | (string | {
        targets: {
            browsers: string[];
        };
        useBuiltIns: boolean;
        modules: boolean;
    })[])[];
    plugins: (string | [string, any])[];
};
export default config;
