const { Settings, BankAccount, User, Payment, Apartment } = require('../models');

exports.getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const query = {};
    
    if (category) {
      query.category = category;
    }
    
    const settings = await Settings.find(query);
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key, value, category, description } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, message: 'Setting key is required' });
    }
    
    const setting = await Settings.findOneAndUpdate(
      { key },
      { value, category, description, key },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, setting });
  } catch (error) {
    console.error('Update Setting Error:', error);
    res.status(500).json({ success: false, message: 'Error updating setting' });
  }
};

exports.getBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ isActive: true }).sort({ isDefault: -1, createdAt: -1 });
    
    res.json({ success: true, accounts });
  } catch (error) {
    console.error('Get Bank Accounts Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching bank accounts' });
  }
};

exports.addBankAccount = async (req, res) => {
  try {
    const { bankName, accountName, accountNumber, branch, swiftCode, isDefault } = req.body;
    
    if (!bankName || !accountName || !accountNumber) {
      return res.status(400).json({ success: false, message: 'Bank name, account name, and account number are required' });
    }
    
    if (isDefault) {
      await BankAccount.updateMany({}, { isDefault: false });
    }
    
    const account = await BankAccount.create({
      bankName,
      accountName,
      accountNumber,
      branch,
      swiftCode,
      isDefault: isDefault || false
    });
    
    res.status(201).json({ success: true, account });
  } catch (error) {
    console.error('Add Bank Account Error:', error);
    res.status(500).json({ success: false, message: 'Error adding bank account' });
  }
};

exports.updateBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { bankName, accountName, accountNumber, branch, swiftCode, isDefault, isActive } = req.body;
    
    const account = await BankAccount.findById(id);
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }
    
    if (isDefault) {
      await BankAccount.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }
    
    if (bankName) account.bankName = bankName;
    if (accountName) account.accountName = accountName;
    if (accountNumber) account.accountNumber = accountNumber;
    if (branch !== undefined) account.branch = branch;
    if (swiftCode !== undefined) account.swiftCode = swiftCode;
    if (isDefault !== undefined) account.isDefault = isDefault;
    if (isActive !== undefined) account.isActive = isActive;
    
    await account.save();
    
    res.json({ success: true, account });
  } catch (error) {
    console.error('Update Bank Account Error:', error);
    res.status(500).json({ success: false, message: 'Error updating bank account' });
  }
};

exports.deleteBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await BankAccount.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }
    
    res.json({ success: true, message: 'Bank account deactivated' });
  } catch (error) {
    console.error('Delete Bank Account Error:', error);
    res.status(500).json({ success: false, message: 'Error deleting bank account' });
  }
};

exports.getDefaultBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.findOne({ isDefault: true, isActive: true });
    
    if (!account) {
      return res.json({ success: true, account: null });
    }
    
    res.json({ success: true, account });
  } catch (error) {
    console.error('Get Default Bank Account Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching default bank account' });
  }
};