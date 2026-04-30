import React from 'react';
import { getPersonColorHue } from '../utils/colors';

interface PersonBadgeProps {
    name: string;
    className?: string;
}

export default function PersonBadge({ name, className = '' }: PersonBadgeProps) {
    const hue = getPersonColorHue(name);
    const isNeutral = hue === -1;

    return (
        <span
            className={`person-badge ${className} ${isNeutral ? 'person-badge-neutral' : ''}`}
            style={!isNeutral ? ({ '--badge-hue': hue } as React.CSSProperties) : undefined}
            title={`Owner: ${name}`}
        >
            {name}
        </span>
    );
}
