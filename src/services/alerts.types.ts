export const ALERT_CONFIG: AlertsType[] = [
    {
        name: 'sub',
        label: 'NEW SUBSCRIBER',
        color: '#9146FF'
    },
    {
        name: 'follow',
        label: 'NEW FOLLOWER',
        color: '#4299E1'
    },
    {
        name: 'bits',
        label: 'BITS CHEERED',
        color: '#F59E0B'
    },
    {
        name: 'raid',
        label: 'INCOMING RAID',
        color: '#22C55E'
    },
    {
        name: 'superchat',
        label: 'SUPER CHAT',
        color: '#EF4444'
    },
    {
        name: 'member',
        label: 'NEW MEMBER',
        color: '#F97316'
    },
];

export type AlertsType = {
    name: string,
    label: string,
    color: string,
}
