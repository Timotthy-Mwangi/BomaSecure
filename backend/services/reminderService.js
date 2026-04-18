const { RentLedger, User } = require('../models');
const { sendSMS, sendEmail } = require('./smsService');

const REMINDER_DAYS = [7, 3, 1, 0];

const sendRentReminders = async () => {
  try {
    console.log('[REMINDER SERVICE] Checking for rent due reminders...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pendingRecords = await RentLedger.find({
      status: { $in: ['pending', 'partial'] }
    }).populate('tenantId', 'name phone email');
    
    let sentCount = 0;
    
    for (const record of pendingRecords) {
      const dueDate = new Date(record.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const tenant = record.tenantId;
      
      if (!tenant || !tenant.phone) continue;
      
      if (daysUntilDue < 0) {
        const message = `REMINDER: Your rent of KES ${record.balance} for ${record.period.month}/${record.period.year} is overdue by ${Math.abs(daysUntilDue)} days. Please pay immediately to avoid late fees.`;
        await sendSMS(tenant.phone, message);
        
        if (tenant.email) {
          await sendEmail(tenant.email, 'URGENT: Overdue Rent Notice', 
            `<p>Dear ${tenant.name},</p><p>Your rent payment is overdue.</p><p>Amount: KES ${record.balance}<br>Period: ${record.period.month}/${record.period.year}</p>`);
        }
        sentCount++;
      } else if (REMINDER_DAYS.includes(daysUntilDue)) {
        const message = `REMINDER: Your rent of KES ${record.rentAmount} for ${record.period.month}/${record.period.year} is due in ${daysUntilDue} day(s). Pay before due date to avoid late fees.`;
        await sendSMS(tenant.phone, message);
        
        if (tenant.email && daysUntilDue === 1) {
          await sendEmail(tenant.email, 'Rent Due Tomorrow', 
            `<p>Dear ${tenant.name},</p><p>Your rent of KES ${record.rentAmount} is due tomorrow.</p>`);
        }
        sentCount++;
      }
    }
    
    console.log(`[REMINDER SERVICE] Sent ${sentCount} reminders`);
    return { success: true, sentCount };
  } catch (error) {
    console.error('[REMINDER SERVICE ERROR]', error);
    return { success: false, error: error.message };
  }
};

const markOverdueRecords = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await RentLedger.updateMany(
      { status: 'pending', dueDate: { $lt: today } },
      { $set: { status: 'overdue' } }
    );
    
    console.log(`[REMINDER SERVICE] Marked ${result.modifiedCount} records as overdue`);
    return { success: true, modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error('[MARK OVERDUE ERROR]', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendRentReminders,
  markOverdueRecords
};