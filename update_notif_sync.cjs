const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/lib/notificationService.ts');
let code = fs.readFileSync(p, 'utf-8');

const relPushFn = `
    // Relational Push
    try {
      if (this.notifications && this.notifications.length > 0) {
        const notifRows = this.notifications.map(n => ({
          id: n.id,
          target_role: n.targetRole,
          category: n.category,
          priority: n.priority,
          title: n.title,
          message: n.message,
          metadata: n.metadata,
          is_read: n.isRead,
          read_at: n.readAt,
          action_url: n.actionUrl,
          snoozed_until: n.snoozedUntil,
          created_at: n.createdAt
        }));
        await supabase.from('notifications').upsert(notifRows, { onConflict: 'id' }).select('id').limit(1);

        // Map notification_references
        const refRows = [];
        this.notifications.forEach(n => {
           if (n.metadata?.debtId) refRows.push({ notification_id: n.id, reference_type: 'debt', reference_id: n.metadata.debtId });
           if (n.metadata?.installmentId) refRows.push({ notification_id: n.id, reference_type: 'installment', reference_id: n.metadata.installmentId });
           if (n.metadata?.repairId) refRows.push({ notification_id: n.id, reference_type: 'repair', reference_id: n.metadata.repairId });
           if (n.metadata?.supplierId) refRows.push({ notification_id: n.id, reference_type: 'supplier', reference_id: n.metadata.supplierId });
        });
        if (refRows.length > 0) {
           await supabase.from('notification_references').upsert(refRows, { onConflict: 'notification_id,reference_type,reference_id' }).select('id').limit(1);
        }
      }
    } catch (e) {
      // Non-blocking
    }
`;

const targetStr = "} catch (e) {\n      // Non-blocking\n    }";
if (code.includes(targetStr)) {
  code = code.replace(targetStr, relPushFn + "\n    " + targetStr);
  fs.writeFileSync(p, code);
  console.log("notificationService.ts relational sync injected");
} else {
  console.log("Could not find target in notificationService.ts");
}
