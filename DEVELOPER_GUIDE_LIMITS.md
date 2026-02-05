# Developer Guide: Plan Limits & Enforcement

## Quick Reference

### When to Check Limits

| Action | Limit to Check | Service Method |
|--------|---------------|----------------|
| Creating a client | Client Limit | `limitService.enforceClientLimit(clinicId)` |
| Adding a clinic member (clinician/admin) | Clinician Limit | `limitService.enforceClinicianLimit(clinicId)` |
| Displaying usage stats | Both | `limitService.getUsageStats(clinicId)` |

## Implementation Examples

### 1. Enforcing Client Limit

```typescript
import limitService from "../subscription/limit.service";

const createClient = async (clinicId: string, clientData: any) => {
  // Check limit before creating
  await limitService.enforceClientLimit(clinicId);
  
  // Proceed with client creation
  const client = await prisma.client.create({
    data: { ...clientData, clinicId }
  });
  
  return client;
};
```

### 2. Enforcing Clinician Limit

```typescript
import limitService from "../subscription/limit.service";

const addClinicMember = async (clinicId: string, memberData: any) => {
  // Only check limit for clinician roles
  if (['clinician', 'admin', 'superAdmin'].includes(memberData.role)) {
    await limitService.enforceClinicianLimit(clinicId);
  }
  
  // Proceed with member creation
  const member = await prisma.clinicMember.create({
    data: { ...memberData, clinicId }
  });
  
  return member;
};
```

### 3. Checking Limits Without Throwing

```typescript
import limitService from "../subscription/limit.service";

const checkIfCanAddClient = async (clinicId: string) => {
  const limitCheck = await limitService.checkClientLimit(clinicId);
  
  if (!limitCheck.canAddClient) {
    return {
      allowed: false,
      message: `Limit reached: ${limitCheck.currentCount}/${limitCheck.limit}`,
      upgradeRequired: true
    };
  }
  
  return {
    allowed: true,
    remaining: limitCheck.limit - limitCheck.currentCount
  };
};
```

### 4. Getting Usage Statistics

```typescript
import limitService from "../subscription/limit.service";

const getDashboardStats = async (clinicId: string) => {
  const stats = await limitService.getUsageStats(clinicId);
  
  return {
    clients: {
      current: stats.clients.currentCount,
      limit: stats.clients.limit,
      percentage: stats.clients.isUnlimited 
        ? 0 
        : (stats.clients.currentCount / stats.clients.limit * 100),
      unlimited: stats.clients.isUnlimited
    },
    clinicians: {
      current: stats.clinicians.currentCount,
      limit: stats.clinicians.limit,
      percentage: stats.clinicians.isUnlimited 
        ? 0 
        : (stats.clinicians.currentCount / stats.clinicians.limit * 100),
      unlimited: stats.clinicians.isUnlimited
    },
    plan: stats.plan,
    subscription: stats.subscription
  };
};
```

## Error Handling

### Client Limit Error
```typescript
try {
  await limitService.enforceClientLimit(clinicId);
} catch (error) {
  if (error.status === 403) {
    // Show upgrade modal or message
    return res.status(403).json({
      error: "Client limit reached",
      message: error.message,
      action: "upgrade_required"
    });
  }
  throw error;
}
```

### Clinician Limit Error
```typescript
try {
  await limitService.enforceClinicianLimit(clinicId);
} catch (error) {
  if (error.status === 403) {
    // Show upgrade modal or message
    return res.status(403).json({
      error: "Clinician limit reached",
      message: error.message,
      action: "upgrade_required"
    });
  }
  throw error;
}
```

## Frontend Integration

### Displaying Usage Stats

```typescript
// API Call
const response = await fetch('/api/subscriptions/usage', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();

// Display in UI
const clientUsage = data.clients.isUnlimited 
  ? 'Unlimited'
  : `${data.clients.currentCount} / ${data.clients.limit}`;

const clinicianUsage = data.clinicians.isUnlimited 
  ? 'Unlimited'
  : `${data.clinicians.currentCount} / ${data.clinicians.limit}`;
```

### Warning Indicators

```typescript
const getUsageWarning = (current: number, limit: number, isUnlimited: boolean) => {
  if (isUnlimited) return null;
  
  const percentage = (current / limit) * 100;
  
  if (percentage >= 100) {
    return { level: 'error', message: 'Limit reached' };
  } else if (percentage >= 80) {
    return { level: 'warning', message: 'Approaching limit' };
  }
  
  return null;
};
```

## Plan Configuration

### Creating a New Plan

```typescript
import planService from "../subscription/plan.service";

const newPlan = await planService.createPlan({
  name: "Starter Plan",
  type: PlanType.starter,
  description: "Perfect for solo practitioners",
  price: 19.99,
  clientLimit: 25,
  clinicianLimit: 2,
  features: {
    clients: true,
    appointments: true,
    notes: true,
    assessments: false,
    integrations: false,
    advanced_reporting: false,
    priority_support: false,
    custom_branding: false,
  }
});
```

### Updating Plan Limits

```typescript
import planService from "../subscription/plan.service";

await planService.updatePlan(planId, {
  clientLimit: 50,      // Update client limit
  clinicianLimit: 3,    // Update clinician limit
  price: 24.99          // Update price
});
```

## Testing

### Unit Test Example

```typescript
describe('Limit Enforcement', () => {
  it('should enforce client limit', async () => {
    // Setup: Create plan with limit of 5
    const plan = await createTestPlan({ clientLimit: 5 });
    const clinic = await createTestClinic({ planId: plan.id });
    
    // Create 5 clients (at limit)
    for (let i = 0; i < 5; i++) {
      await createTestClient({ clinicId: clinic.id });
    }
    
    // Attempt to create 6th client (should fail)
    await expect(
      limitService.enforceClientLimit(clinic.id)
    ).rejects.toThrow('Client limit reached');
  });
  
  it('should allow unlimited clients when limit is 0', async () => {
    const plan = await createTestPlan({ clientLimit: 0 });
    const clinic = await createTestClinic({ planId: plan.id });
    
    // Create many clients
    for (let i = 0; i < 100; i++) {
      await createTestClient({ clinicId: clinic.id });
    }
    
    // Should not throw
    await expect(
      limitService.enforceClientLimit(clinic.id)
    ).resolves.not.toThrow();
  });
});
```

## Common Patterns

### Pre-flight Check

```typescript
// Check before showing "Add Client" button
const canAddClient = async (clinicId: string) => {
  try {
    const check = await limitService.checkClientLimit(clinicId);
    return check.canAddClient;
  } catch (error) {
    return false;
  }
};
```

### Soft Warning

```typescript
// Show warning at 80% usage
const checkUsageWarning = async (clinicId: string) => {
  const stats = await limitService.getUsageStats(clinicId);
  
  const clientPercentage = stats.clients.isUnlimited 
    ? 0 
    : (stats.clients.currentCount / stats.clients.limit * 100);
    
  if (clientPercentage >= 80 && clientPercentage < 100) {
    showWarning(`You're using ${clientPercentage.toFixed(0)}% of your client limit`);
  }
};
```

### Upgrade Prompt

```typescript
const handleLimitReached = (error: any) => {
  if (error.status === 403 && error.message.includes('limit reached')) {
    showUpgradeModal({
      title: 'Upgrade Required',
      message: error.message,
      action: 'View Plans',
      onAction: () => router.push('/plans')
    });
  }
};
```

## Best Practices

1. **Always check limits before creation operations**
   - Use `enforceClientLimit()` or `enforceClinicianLimit()`
   - Handle errors gracefully with user-friendly messages

2. **Show usage stats in dashboards**
   - Use `getUsageStats()` to display current usage
   - Show progress bars or percentage indicators

3. **Provide upgrade paths**
   - When limits are reached, show clear upgrade options
   - Link directly to plan selection/upgrade page

4. **Use soft warnings**
   - Warn users when approaching limits (e.g., 80% usage)
   - Give them time to upgrade before hitting hard limits

5. **Handle unlimited plans correctly**
   - Check `isUnlimited` flag before showing limits
   - Display "Unlimited" instead of numbers for unlimited plans

6. **Cache usage stats appropriately**
   - Don't query on every request
   - Refresh when relevant actions occur (client created, member added)

## Troubleshooting

### Issue: Limit check fails with "No clinic association found"
**Solution:** Ensure `clinicId` is properly set in request context or passed as parameter

### Issue: Unlimited plan still shows limits
**Solution:** Check that plan's `clientLimit` or `clinicianLimit` is set to 0

### Issue: Limit not enforced
**Solution:** Verify `enforceClientLimit()` or `enforceClinicianLimit()` is called before creation

### Issue: Wrong count displayed
**Solution:** Check that inactive/deleted records are properly filtered in count queries
