import { useState, useEffect } from "react";
import { Users, Plus, Phone, Trash2, Star, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/App";
import { motion, AnimatePresence } from "framer-motion";

export const Contacts = () => {
  const { token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    relationship: "family",
    is_primary: false
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const url = editingContact
        ? `${process.env.REACT_APP_BACKEND_URL}/api/contacts/${editingContact.id}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/contacts`;
      
      const response = await fetch(url, {
        method: editingContact ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingContact ? "Contact updated" : "Contact added");
        resetForm();
        fetchContacts();
      } else {
        toast.error("Failed to save contact");
      }
    } catch (error) {
      toast.error("Connection error");
    }
  };

  const deleteContact = async (id) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/contacts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Contact deleted");
        fetchContacts();
      } else {
        toast.error("Failed to delete contact");
      }
    } catch (error) {
      toast.error("Connection error");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      relationship: "family",
      is_primary: false
    });
    setEditingContact(null);
    setDialogOpen(false);
  };

  const openEditDialog = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      is_primary: contact.is_primary
    });
    setDialogOpen(true);
  };

  const relationships = [
    { value: "family", label: "Family" },
    { value: "friend", label: "Friend" },
    { value: "partner", label: "Partner" },
    { value: "colleague", label: "Colleague" },
    { value: "other", label: "Other" }
  ];

  return (
    <div className="p-6" data-testid="contacts-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 
            className="text-2xl font-black text-zinc-50 tracking-tight"
            style={{ fontFamily: 'Chivo, sans-serif' }}
          >
            Emergency Contacts
          </h1>
          <p className="text-zinc-500 text-sm">People who will be notified in emergencies</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-violet-500 hover:bg-violet-600"
              data-testid="add-contact-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-50">
                {editingContact ? "Edit Contact" : "Add Emergency Contact"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-zinc-300">Name *</Label>
                <Input
                  placeholder="Contact name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-50 mt-1"
                  data-testid="contact-name-input"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Phone Number *</Label>
                <Input
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-50 mt-1"
                  data-testid="contact-phone-input"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Relationship</Label>
                <Select
                  value={formData.relationship}
                  onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-50 mt-1" data-testid="relationship-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {relationships.map((rel) => (
                      <SelectItem key={rel.value} value={rel.value} className="text-zinc-50">
                        {rel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-zinc-300">Primary Contact</Label>
                  <p className="text-xs text-zinc-500">First to be notified</p>
                </div>
                <Switch
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
                  data-testid="primary-switch"
                />
              </div>
              <Button 
                onClick={handleSubmit}
                className="w-full bg-violet-500 hover:bg-violet-600"
                data-testid="save-contact-btn"
              >
                {editingContact ? "Update Contact" : "Add Contact"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : contacts.length === 0 ? (
        <Card className="border border-zinc-800 bg-zinc-900" data-testid="empty-contacts">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-bold text-zinc-50 mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              No Emergency Contacts
            </h3>
            <p className="text-zinc-500 mb-4">
              Add contacts who will be notified when you trigger an SOS alert
            </p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-violet-500 hover:bg-violet-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {contacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors"
                  data-testid={`contact-card-${contact.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-lg">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-zinc-50 font-medium">{contact.name}</p>
                          {contact.is_primary && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Phone className="w-3 h-3" />
                          <span>{contact.phone}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="capitalize">{contact.relationship}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditDialog(contact)}
                          className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700 transition-colors"
                          data-testid={`edit-contact-${contact.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteContact(contact.id)}
                          className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          data-testid={`delete-contact-${contact.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Card */}
      <Card className="border border-zinc-800 bg-zinc-900 mt-6">
        <CardContent className="p-4">
          <p className="text-sm text-zinc-400">
            <strong className="text-zinc-300">How it works:</strong> When you trigger an SOS alert, 
            all your emergency contacts will receive a notification with your current location. 
            Primary contacts are notified first.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
