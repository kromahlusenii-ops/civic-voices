# Simplified Role Selection - Less Overwhelming UX

## Problem

The role selection screen had 12 specific roles with detailed descriptions, which was overwhelming for users during onboarding.

## Solution

Simplified to **6 broad categories** with shorter, clearer descriptions.

## Changes

### Before (12 Roles, Overwhelming)
- Government Communications
- City Official  
- Elected Official / Staff
- Tech Policy Professional
- Political Content Creator
- Journalist / Reporter
- Nonprofit / Civic Organization
- Brand Marketer / Agency
- Researcher / Academic
- Community Organizer / Activist
- Real Estate / Development
- Just Exploring

### After (6 Roles, Simple)

| Icon | Title | Subtitle |
|------|-------|----------|
| 🏛️ | **Government** | Public sector officials and staff |
| 📰 | **Media** | Journalists and content creators |
| 🤝 | **Nonprofit** | Advocacy and community organizations |
| 🔬 | **Research** | Academics and policy analysts |
| 📊 | **Business** | Marketing and communications professionals |
| 🔍 | **Exploring** | Just browsing civic intelligence |

## UI Improvements

### 1. Removed Search Bar
- Before: Had a search input at the top
- After: Clean, direct selection grid

### 2. Cleaner Layout
- **2-column grid** (mobile: 1 column)
- **Larger cards** with more breathing room
- **Bigger icons** (4xl size)
- **Clearer hierarchy**: Icon → Title → Subtitle

### 3. Simplified Text
- **Shorter titles**: "Government" instead of "Government Communications"
- **Concise subtitles**: One clear line explaining who it's for
- **No categories needed**: 6 options are self-explanatory

### 4. Better Visual Feedback
- **Selected state**: Red border + red background
- **Checkmark icon**: Clear visual confirmation
- **Hover state**: Subtle shadow and background change

## Code Changes

### File Modified
`app/onboarding/components/RoleSelectionScreen.tsx`

### What Changed

**1. Reduced ROLES array from 12 to 6:**
```typescript
// Before: 12 roles with categories
const ROLES = [
  { id: 'govt-comms', title: 'Government Communications', ... category: 'Government' },
  { id: 'city-official', title: 'City Official', ... category: 'Government' },
  // ... 10 more
]

// After: 6 simple roles, no categories
const ROLES = [
  { id: 'govt-comms', title: 'Government', subtitle: 'Public sector officials and staff', icon: '🏛️' },
  { id: 'journalist', title: 'Media', subtitle: 'Journalists and content creators', icon: '📰' },
  // ... 4 more
]
```

**2. Removed search functionality:**
```typescript
// Removed: useState, search filtering, category grouping
const [searchQuery, setSearchQuery] = useState('')
const filteredRoles = searchQuery.trim() ? ROLES.filter(...) : ROLES
const groupedRoles = filteredRoles.reduce(...)
```

**3. Simplified rendering:**
```typescript
// Before: Grouped by category with search
{Object.entries(groupedRoles).map(([category, roles]) => (
  <div>
    <h3>{category}</h3>
    {roles.map(role => <RoleCard />)}
  </div>
))}

// After: Direct grid rendering
{ROLES.map((role) => (
  <RoleCard key={role.id} {...role} />
))}
```

## Role Mapping

The simplified roles still map to the same topic recommendations. The `id` values were kept for backward compatibility:

| New Title | ID (unchanged) | Maps To |
|-----------|----------------|---------|
| Government | `govt-comms` | Housing, Public Safety, Democracy, Infrastructure |
| Media | `journalist` | Public Safety, Democracy, Housing |
| Nonprofit | `nonprofit` | Housing, Health, Public Safety, Democracy |
| Research | `researcher` | All categories for comprehensive analysis |
| Business | `brand-marketer` | Education, Economic Development, Online Behavior |
| Exploring | `exploring` | Mix of high-impact civic topics |

## Benefits

1. **Less Cognitive Load**: 6 clear choices vs 12 nuanced ones
2. **Faster Decision Making**: Users can quickly identify their category
3. **Cleaner Visual Design**: More space, less clutter
4. **Mobile-Friendly**: Works better on smaller screens
5. **Reduced Anxiety**: Not overwhelmed by too many options

## User Flow

1. **Land on role selection** → See 6 clear options
2. **Quick scan** → Icon + Title immediately communicate purpose
3. **Select role** → Red highlight + checkmark confirms selection
4. **Continue** → Proceed to pre-selected topics

## Testing

Test the simplified flow:
```bash
npm run dev
# 1. Go to /signup
# 2. Create account
# 3. See clean 6-option role selection
# 4. Select and continue
```

## Design Principles Applied

✅ **Hick's Law**: Fewer choices = faster decisions  
✅ **Progressive Disclosure**: Start broad, can refine later  
✅ **Visual Hierarchy**: Clear information architecture  
✅ **Accessibility**: Larger touch targets, clearer labels  

---

**Last Updated:** February 17, 2026  
**File Modified:** `app/onboarding/components/RoleSelectionScreen.tsx`  
**Status:** Production Ready
