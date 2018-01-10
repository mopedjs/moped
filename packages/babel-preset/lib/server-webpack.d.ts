declare const config: {
    presets: (string | (string | {
        targets: {
            node: string;
        };
        modules: boolean;
    })[])[];
    plugins: (string | [string, any])[];
};
export default config;
