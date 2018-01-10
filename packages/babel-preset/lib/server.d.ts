declare const config: {
    presets: (string | (string | {
        targets: {
            node: string;
        };
    })[])[];
    plugins: (string | [string, any])[];
};
export default config;
