const { Feedback, User, Apartment, Notification } = require('../models');
const mongoose = require('mongoose');

// Helper to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Submit new feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { subject, message, category } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required.' });
    }

    const user = await User.findById(userId).select('apartmentId name'); // Also select name for notification
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const feedback = new Feedback({
      userId,
      userRole,
      apartmentId: user.apartmentId, // Associate feedback with user's apartment if available
      subject,
      message,
      category: category || 'general_inquiry',
      status: 'new',
    });

    await feedback.save();

    // Notify admins about new feedback
    const io = req.app.get('io');
    if (io) {
      // Emit to the specific apartment room so relevant users receive real-time updates
      if (user.apartmentId) {
        io.to(`apartment-${user.apartmentId}`).emit('feedback:new', { feedback });
      }
      
      // Also send a notification record
      const adminNotification = new Notification({
        userId: apartment.adminId,
        title: `New Feedback: ${subject}`,
        message: `A new feedback has been submitted by ${user.name} (${userRole}).`,
        type: 'feedback',
        data: { 
          feedbackId: feedback._id, 
          apartmentId: user.apartmentId,
          category: feedback.category
        },
        isRead: false,
      });

      // Direct notification to the building's specific admin
      const apartment = await Apartment.findById(user.apartmentId);
      if (apartment && apartment.adminId) {
        await adminNotification.save();
        io.to(`user-${apartment.adminId}`).emit('notification:new', adminNotification);
        io.to(`admin-${apartment.adminId}`).emit('feedback:new', { feedback });
      }
    }

    res.status(201).json({ success: true, message: 'Feedback submitted successfully.', feedback });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get all feedback (admins) or user's own feedback (tenants/guards)
exports.getAllFeedback = async (req, res) => {
  try {
    const { status, category, type, page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query = {};

    if (userRole === 'admin') {
      // Admins can see all feedback from properties they manage
      const adminApartments = await Apartment.find({ adminId: userId }).select('_id');
      const adminApartmentIds = adminApartments.map(a => a._id.toString());

      // Also include the admin's own apartmentId if they have one assigned
      const adminUser = await User.findById(userId).select('apartmentId');
      if (adminUser?.apartmentId && !adminApartmentIds.includes(adminUser.apartmentId.toString())) {
        adminApartmentIds.push(adminUser.apartmentId.toString());
      }

      if (adminApartmentIds.length > 0) {
        // Show feedback from apartments the admin manages OR feedback without apartmentId (legacy data)
        query.$or = [
          { apartmentId: { $in: adminApartmentIds } },
          { apartmentId: { $exists: false } },
          { apartmentId: null }
        ];
      } else {
        // If admin manages no apartments, they can only see feedback they submitted (if any)
        query.userId = userId;
      }
    } else if (userRole === 'tenant' || userRole === 'guard') {
      // Tenants and guards see their own feedback OR building-wide complaints (Group Complaints)
      const user = await User.findById(userId).select('apartmentId');
      if (user && user.apartmentId) {
        query.$or = [
          { userId: userId },
          { apartmentId: user.apartmentId, category: 'complaint' }
        ];
      } else {
        query.userId = userId;
      }
    } else {
      query.userId = userId;
    }

    if (status) query.status = status;
    const finalCategory = category || type;
    if (finalCategory) query.category = finalCategory;

    const feedback = await Feedback.find(query)
      .populate('userId', 'name email phone role')
      .populate('apartmentId', 'buildingName')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Feedback.countDocuments(query);

    res.json({
      success: true,
      feedback,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get single feedback item
exports.getFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid feedback ID.' });
    }

    const feedback = await Feedback.findById(id)
      .populate('userId', 'name email phone role')
      .populate('apartmentId', 'buildingName')
      .populate('resolvedBy', 'name');

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found.' });
    }

    // Data isolation: ensure user can only view their own feedback or feedback from their managed properties
    if (userRole !== 'admin' && feedback.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this feedback.' });
    }
    if (userRole === 'admin') {
        const adminApartments = await Apartment.find({ adminId: userId }).select('_id');
        const adminApartmentIds = adminApartments.map(a => a._id.toString());
        
        // Also check admin's own apartmentId
        const adminUser = await User.findById(userId).select('apartmentId');
        if (adminUser?.apartmentId && !adminApartmentIds.includes(adminUser.apartmentId.toString())) {
          adminApartmentIds.push(adminUser.apartmentId.toString());
        }

        // Allow if feedback has no apartmentId (legacy) or matches admin's apartments
        const hasAccess = !feedback.apartmentId || adminApartmentIds.includes(feedback.apartmentId.toString());
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this feedback.' });
        }
    }


    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Update feedback status/notes (admin only)
exports.updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can update feedback.' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid feedback ID.' });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found.' });
    }

    // Data isolation: admin can only update feedback from properties they manage
    const adminApartments = await Apartment.find({ adminId: userId }).select('_id');
    const adminApartmentIds = adminApartments.map(a => a._id.toString());
    
    // Also check admin's own apartmentId
    const adminUser = await User.findById(userId).select('apartmentId');
    if (adminUser?.apartmentId && !adminApartmentIds.includes(adminUser.apartmentId.toString())) {
      adminApartmentIds.push(adminUser.apartmentId.toString());
    }

    // Allow if feedback has no apartmentId (legacy) or matches admin's apartments
    const hasAccess = !feedback.apartmentId || adminApartmentIds.includes(feedback.apartmentId.toString());
    if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this feedback.' });
    }

    if (status) feedback.status = status;
    if (adminNotes) feedback.adminNotes = adminNotes;

    if (status === 'resolved' || status === 'closed') {
      feedback.resolvedBy = userId;
      feedback.resolvedAt = new Date();
    } else {
      feedback.resolvedBy = undefined;
      feedback.resolvedAt = undefined;
    }

    await feedback.save();

    // Notify the user who submitted the feedback about the update
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${feedback.userId}`).emit('feedback:updated', { feedback });
      const userNotification = new Notification({
        userId: feedback.userId,
        title: `Feedback Status Update: ${feedback.subject}`,
        message: `Your feedback "${feedback.subject}" is now ${feedback.status.replace('_', ' ')}.`,
        type: 'feedback_update',
        data: { feedbackId: feedback._id },
        isRead: false,
      });
      await userNotification.save();
      io.to(`user-${feedback.userId}`).emit('notification:new', userNotification);
    }

    res.json({ success: true, message: 'Feedback updated successfully.', feedback });
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Delete feedback (admin only)
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can delete feedback.' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid feedback ID.' });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found.' });
    }

    // Data isolation: admin can only delete feedback from properties they manage
    const adminApartments = await Apartment.find({ adminId: userId }).select('_id');
    const adminApartmentIds = adminApartments.map(a => a._id.toString());
    
    // Also check admin's own apartmentId
    const adminUser = await User.findById(userId).select('apartmentId');
    if (adminUser?.apartmentId && !adminApartmentIds.includes(adminUser.apartmentId.toString())) {
      adminApartmentIds.push(adminUser.apartmentId.toString());
    }

    // Allow if feedback has no apartmentId (legacy) or matches admin's apartments
    const hasAccess = !feedback.apartmentId || adminApartmentIds.includes(feedback.apartmentId.toString());
    if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this feedback.' });
    }

    await Feedback.findByIdAndDelete(id);

    // Optionally notify the user who submitted the feedback
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${feedback.userId}`).emit('feedback:deleted', { feedbackId: id });
      const userNotification = new Notification({
        userId: feedback.userId,
        title: `Feedback Deleted: ${feedback.subject}`,
        message: `Your feedback "${feedback.subject}" has been deleted by an administrator.`,
        type: 'feedback_deleted',
        data: { feedbackId: id },
        isRead: false,
      });
      await userNotification.save();
      io.to(`user-${feedback.userId}`).emit('notification:new', userNotification);
    }

    res.json({ success: true, message: 'Feedback deleted successfully.' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};