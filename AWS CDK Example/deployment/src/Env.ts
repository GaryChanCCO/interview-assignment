export type EnvVar = 'BACKEND_DIR' | 'FRONTEND_DIR'| 'API_DIR';

export function getEnvVar(envVar: EnvVar): string {
    switch (envVar) {
        default: {
            const result = process.env[envVar];
            if (result === undefined) throw new Error(`Env var ${envVar} not defined`);
            return result;
        }
    }
}
