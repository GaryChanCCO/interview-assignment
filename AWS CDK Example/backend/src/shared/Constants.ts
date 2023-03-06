import { castImmutable } from 'immer';

type Tables = 'Stat';
interface Table {
    name: string;
}
export const tables = castImmutable<Record<Tables, Table>>({
    Stat: {
        name: 'Stat',
    },
});
