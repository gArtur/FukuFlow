import type { FamilyMember } from '../types';
import { OWNER_LABELS } from '../types';

interface FamilyFilterProps {
    selected: FamilyMember;
    onSelect: (member: FamilyMember) => void;
}

const members: FamilyMember[] = ['all', 'self', 'wife', 'daughter'];

const labels: Record<FamilyMember, string> = {
    all: 'All',
    ...OWNER_LABELS
};

export default function FamilyFilter({ selected, onSelect }: FamilyFilterProps) {
    return (
        <div className="filter-tabs">
            {members.map(member => (
                <button
                    key={member}
                    className={`filter-tab ${selected === member ? 'active' : ''}`}
                    onClick={() => onSelect(member)}
                >
                    {labels[member]}
                </button>
            ))}
        </div>
    );
}
