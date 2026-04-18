const { RentLedger, User, Apartment } = require('../models');

const rentLedgerController = {
  async createRentRecord(req, res) {
    try {
      const { tenantId, apartmentId, unitNumber, period, rentAmount, amountPaid, dueDate, paymentMethod, reference, notes } = req.body;
      
      const balance = rentAmount - (amountPaid || 0);
      const status = balance <= 0 ? 'paid' : balance < rentAmount ? 'partial' : 'pending';
      
      const rentRecord = new RentLedger({
        tenantId,
        apartmentId,
        unitNumber,
        period,
        rentAmount,
        amountPaid: amountPaid || 0,
        balance,
        dueDate,
        paymentMethod: paymentMethod || 'manual',
        reference,
        notes,
        status,
        recordedBy: req.user?.id,
        paidDate: status === 'paid' ? new Date() : null
      });
      
      await rentRecord.save();
      
      if (tenantId) {
        await User.findByIdAndUpdate(tenantId, {
          rentBalance: balance,
          rentStatus: status,
          currentPeriodStart: new Date(period.year, period.month - 1, 1),
          currentPeriodEnd: new Date(period.year, period.month, 0)
        });
      }
      
      res.status(201).json({ success: true, data: rentRecord });
    } catch (error) {
      console.error('Create rent record error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTenantRentLedger(req, res) {
    try {
      const { tenantId } = req.params;
      const records = await RentLedger.find({ tenantId })
        .sort({ 'period.year': -1, 'period.month': -1 })
        .populate('recordedBy', 'name email');
      
      res.json({ success: true, data: records });
    } catch (error) {
      console.error('Get tenant rent ledger error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAllRentLedger(req, res) {
    try {
      const { status, month, year, search } = req.query;
      const filter = {};
      
      if (status && status !== 'all') filter.status = status;
      if (month && year) {
        filter['period.month'] = parseInt(month);
        filter['period.year'] = parseInt(year);
      }
      
      let records = await RentLedger.find(filter)
        .sort({ 'period.year': -1, 'period.month': -1, createdAt: -1 })
        .populate('tenantId', 'name email phone roomNumber')
        .populate('apartmentId', 'number floor')
        .populate('recordedBy', 'name email');
      
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        records = records.filter(r => {
          const tenant = r.tenantId;
          return tenant?.name?.match(searchRegex) || tenant?.email?.match(searchRegex) || tenant?.roomNumber?.match(searchRegex) || r.unitNumber?.match(searchRegex);
        });
      }
      
      const summary = await calculateLedgerSummary(filter);
      
      res.json({ success: true, data: records, summary });
    } catch (error) {
      console.error('Get all rent ledger error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateRentRecord(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const record = await RentLedger.findById(id);
      if (!record) {
        return res.status(404).json({ success: false, error: 'Rent record not found' });
      }
      
      if (updates.amountPaid !== undefined) {
        record.amountPaid = updates.amountPaid;
        record.balance = record.rentAmount - updates.amountPaid;
        record.status = record.balance <= 0 ? 'paid' : record.balance < record.rentAmount ? 'partial' : 'pending';
        if (record.status === 'paid' && !record.paidDate) {
          record.paidDate = new Date();
        }
      }
      
      if (updates.paymentMethod) record.paymentMethod = updates.paymentMethod;
      if (updates.reference) record.reference = updates.reference;
      if (updates.notes) record.notes = updates.notes;
      
      if (updates.lateFee !== undefined) {
        record.lateFee = updates.lateFee;
        record.lateFeeApplied = updates.lateFee > 0;
      }
      
      await record.save();
      
      if (record.tenantId) {
        await User.findByIdAndUpdate(record.tenantId, {
          rentBalance: record.balance,
          rentStatus: record.status
        });
      }
      
      res.json({ success: true, data: record });
    } catch (error) {
      console.error('Update rent record error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteRentRecord(req, res) {
    try {
      const { id } = req.params;
      const record = await RentLedger.findByIdAndDelete(id);
      
      if (!record) {
        return res.status(404).json({ success: false, error: 'Rent record not found' });
      }
      
      res.json({ success: true, message: 'Rent record deleted' });
    } catch (error) {
      console.error('Delete rent record error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async generateReport(req, res) {
    try {
      const { month, year, format = 'json' } = req.query;
      
      const filter = {};
      if (month && year) {
        filter['period.month'] = parseInt(month);
        filter['period.year'] = parseInt(year);
      }
      
      const records = await RentLedger.find(filter)
        .populate('tenantId', 'name email phone roomNumber')
        .populate('apartmentId', 'number floor')
        .sort({ 'period.month': -1, 'period.year': -1 });
      
      if (format === 'csv') {
        const csv = generateCSV(records);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=rent-report-${year}-${month}.csv`);
        return res.send(csv);
      }
      
      const summary = await calculateLedgerSummary(filter);
      res.json({ success: true, data: records, summary });
    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async applyLateFees(req, res) {
    try {
      const { lateFeePercent = 10 } = req.body;
      
      const overdueRecords = await RentLedger.find({
        status: { $in: ['pending', 'partial'] },
        dueDate: { $lt: new Date() }
      });
      
      let updated = 0;
      for (const record of overdueRecords) {
        if (!record.lateFeeApplied) {
          const lateFee = Math.round((record.rentAmount - record.amountPaid) * (lateFeePercent / 100));
          record.lateFee = lateFee;
          record.lateFeeApplied = true;
          await record.save();
          updated++;
        }
      }
      
      res.json({ success: true, message: `Late fees applied to ${updated} records`, count: updated });
    } catch (error) {
      console.error('Apply late fees error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLedgerSummary(req, res) {
    try {
      const summary = await calculateLedgerSummary({});
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Get ledger summary error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async triggerReminders(req, res) {
    try {
      const { sendRentReminders, markOverdueRecords } = require('../services/reminderService');
      
      await markOverdueRecords();
      const result = await sendRentReminders();
      
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Trigger reminders error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async bulkCreateRecords(req, res) {
    try {
      const { records } = req.body;
      
      const created = await RentLedger.insertMany(records.map(r => ({
        ...r,
        recordedBy: req.user?.id,
        balance: r.rentAmount - (r.amountPaid || 0),
        status: (r.rentAmount - (r.amountPaid || 0)) <= 0 ? 'paid' : 'pending'
      })));
      
      res.status(201).json({ success: true, count: created.length, data: created });
    } catch (error) {
      console.error('Bulk create records error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

async function calculateLedgerSummary(filter) {
  const records = await RentLedger.find(filter);
  
  const totalRent = records.reduce((sum, r) => sum + r.rentAmount, 0);
  const totalPaid = records.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalLateFees = records.reduce((sum, r) => sum + r.lateFee, 0);
  const totalBalance = records.reduce((sum, r) => sum + r.balance, 0);
  const paidCount = records.filter(r => r.status === 'paid').length;
  const partialCount = records.filter(r => r.status === 'partial').length;
  const pendingCount = records.filter(r => r.status === 'pending').length;
  const overdueCount = records.filter(r => r.status === 'overdue').length;
  
  return {
    totalRecords: records.length,
    totalRent,
    totalPaid,
    totalLateFees,
    totalBalance,
    paidCount,
    partialCount,
    pendingCount,
    overdueCount
  };
}

function generateCSV(records) {
  const headers = 'Period,Tenant,Unit,Rent Amount,Paid,Balance,Late Fee,Due Date,Paid Date,Status,Reference\n';
  const rows = records.map(r => {
    const period = `${r.period.month}/${r.period.year}`;
    const tenant = r.tenantId?.name || 'N/A';
    const unit = r.unitNumber || r.tenantId?.roomNumber || 'N/A';
    return `${period},${tenant},${unit},${r.rentAmount},${r.amountPaid},${r.balance},${r.lateFee},${r.dueDate?.toISOString().split('T')[0]},${r.paidDate?.toISOString().split('T')[0] || ''},${r.status},${r.reference || ''}`;
  }).join('\n');
  
  return headers + rows;
}

module.exports = rentLedgerController;