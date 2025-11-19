import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Package as PackageIcon,
  CheckCircle2,
  Trash2,
  Camera,
  X,
  ClipboardList,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import ThemeToggle from '@/components/theme-toggle';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { stockCountService, type StockCountSubmission } from '@/services/stockCountService';

interface CartItem {
  id: string;
  deviceType: string;
  itemDescription: string;
  itemCategory: string;
  itemNature: string;
  quantity: number;
  itemUrl?: string;
  thumbnail?: string;
}

interface StockCountFormData {
  countType: string;
  stockHolder: string;
  nameOrLocation: string;
  contractorCompany: string;
  contractorRegion: string;
  technicianName: string;
  techId: string;
  itemCategory: string;
  itemNature: string;
  binLocation: string;
}

interface ItemDetailData {
  cartItemId: string;
  binLocation: string;
  itemStatus: string;
  overallCondition: string;
  faultReason: string;
  xliCaseRef: string;
  // Serial numbers (for serialized items)
  manufactureSerialNumber: string;
  qrCodeSerialNumber: string;
  xlinkSerialNumber: string;
  cradleSerialNumber: string;
  chargerSerialNumber: string;
}

const ITEM_STATUS_OPTIONS = [
  'Good',
  'Faulty',
  'Damaged',
  'Missing',
  'In Repair',
];

const CONDITION_OPTIONS = [
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Non-Functional',
];

const StockCountsCart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get cart and form data from navigation state
  const { cart = [], formData } = (location.state as {
    cart: CartItem[],
    formData: StockCountFormData
  }) || { cart: [], formData: null };

  const [itemDetails, setItemDetails] = useState<ItemDetailData[]>([]);
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [currentScanField, setCurrentScanField] = useState<string | null>(null);

  // Form state for current item
  const [currentItemData, setCurrentItemData] = useState<Partial<ItemDetailData>>({
    binLocation: formData?.binLocation || '',
    itemStatus: '',
    overallCondition: '',
    faultReason: '',
    xliCaseRef: '',
    manufactureSerialNumber: '',
    qrCodeSerialNumber: '',
    xlinkSerialNumber: '',
    cradleSerialNumber: '',
    chargerSerialNumber: '',
  });

  // Check if we have necessary data
  if (!cart || cart.length === 0 || !formData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">No Items in Cart</h2>
            <p className="text-muted-foreground">
              Please add items to your cart from the Stock Counts page.
            </p>
            <Button onClick={() => navigate('/stock-counts')}>
              Go to Stock Counts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalItems = cart.length;
  const completedItems = itemDetails.length;
  const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const isItemCompleted = (itemId: string) => {
    return itemDetails.some(detail => detail.cartItemId === itemId);
  };

  const handleOpenDetailSheet = (item: CartItem) => {
    setSelectedCartItem(item);

    // Check if we already have details for this item
    const existingDetails = itemDetails.find(d => d.cartItemId === item.id);

    if (existingDetails) {
      setCurrentItemData(existingDetails);
    } else {
      setCurrentItemData({
        binLocation: formData?.binLocation || '',
        itemStatus: '',
        overallCondition: '',
        faultReason: '',
        xliCaseRef: '',
        manufactureSerialNumber: '',
        qrCodeSerialNumber: '',
        xlinkSerialNumber: '',
        cradleSerialNumber: '',
        chargerSerialNumber: '',
      });
    }

    setShowDetailSheet(true);
  };

  const handleSaveItemDetails = () => {
    if (!selectedCartItem) return;

    // Validate required fields
    if (!currentItemData.itemStatus) {
      toast({
        title: 'Missing required field',
        description: 'Please select Item Status',
        variant: 'destructive',
      });
      return;
    }

    // For serialized items, at least one serial number should be provided
    const isSerialised = selectedCartItem.itemNature === 'Serialised';
    if (isSerialised) {
      const hasSerialNumber =
        currentItemData.manufactureSerialNumber ||
        currentItemData.qrCodeSerialNumber ||
        currentItemData.xlinkSerialNumber ||
        currentItemData.cradleSerialNumber ||
        currentItemData.chargerSerialNumber;

      if (!hasSerialNumber) {
        toast({
          title: 'Serial number required',
          description: 'Please provide at least one serial number for serialized items',
          variant: 'destructive',
        });
        return;
      }
    }

    const itemDetail: ItemDetailData = {
      cartItemId: selectedCartItem.id,
      binLocation: currentItemData.binLocation || '',
      itemStatus: currentItemData.itemStatus!,
      overallCondition: currentItemData.overallCondition || '',
      faultReason: currentItemData.faultReason || '',
      xliCaseRef: currentItemData.xliCaseRef || '',
      manufactureSerialNumber: currentItemData.manufactureSerialNumber || '',
      qrCodeSerialNumber: currentItemData.qrCodeSerialNumber || '',
      xlinkSerialNumber: currentItemData.xlinkSerialNumber || '',
      cradleSerialNumber: currentItemData.cradleSerialNumber || '',
      chargerSerialNumber: currentItemData.chargerSerialNumber || '',
    };

    // Update or add item details
    const existingIndex = itemDetails.findIndex(d => d.cartItemId === selectedCartItem.id);
    if (existingIndex >= 0) {
      const updated = [...itemDetails];
      updated[existingIndex] = itemDetail;
      setItemDetails(updated);
      toast({
        title: 'Item updated',
        description: 'Item details have been updated',
      });
    } else {
      setItemDetails([...itemDetails, itemDetail]);
      toast({
        title: 'Item completed',
        description: 'Item details have been saved',
      });
    }

    setShowDetailSheet(false);
    setSelectedCartItem(null);
  };

  const handleRemoveItemDetail = (cartItemId: string) => {
    setItemDetails(itemDetails.filter(d => d.cartItemId !== cartItemId));
    toast({
      title: 'Item removed',
      description: 'Item details have been removed',
    });
  };

  const openScanner = (fieldName: string) => {
    setCurrentScanField(fieldName);
    setShowScanner(true);
  };

  const handleBarcodeScanned = (result: string) => {
    if (currentScanField) {
      setCurrentItemData({
        ...currentItemData,
        [currentScanField]: result,
      });
      toast({
        title: 'Scanned successfully',
        description: `Serial number captured: ${result}`,
      });
    }
    setShowScanner(false);
    setCurrentScanField(null);
  };

  const handleSubmitStockCount = async () => {
    if (completedItems < totalItems) {
      toast({
        title: 'Incomplete items',
        description: `Please complete details for all ${totalItems} items (${completedItems} completed)`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare submissions by combining cart items with their details
      const submissions: StockCountSubmission[] = cart.map(cartItem => {
        const detail = itemDetails.find(d => d.cartItemId === cartItem.id)!;

        return {
          'Count Type': formData.countType,
          'Stock Holder': formData.stockHolder,
          'Name or Location': formData.stockHolder === 'Technician'
            ? formData.technicianName
            : formData.nameOrLocation,
          'Item Category': cartItem.itemCategory,
          'BIN LOCATION': detail.binLocation,
          'Device Type': cartItem.deviceType,
          'Item Nature': cartItem.itemNature,
          'Item Code': cartItem.deviceType,
          'Item Description': cartItem.itemDescription,
          'Quantity': cartItem.quantity,
          'Contractor Company': formData.stockHolder === 'Technician' ? formData.contractorCompany : '',
          'Contractor Region': formData.stockHolder === 'Technician' ? formData.contractorRegion : '',
          'Technician Name': formData.stockHolder === 'Technician' ? formData.technicianName : '',
          'Tech ID': formData.stockHolder === 'Technician' ? formData.techId : '',
          'Item Status': detail.itemStatus,
          'Overall Condition': detail.overallCondition,
          'Fault Reason': detail.faultReason,
          'XLI Case Ref': detail.xliCaseRef,
          'Manufacture Serial Number': detail.manufactureSerialNumber,
          'QR Code Serial Number': detail.qrCodeSerialNumber,
          'Xlink Serial Number': detail.xlinkSerialNumber,
          'Cradle Serial Number': detail.cradleSerialNumber,
          'Charger Serial Number': detail.chargerSerialNumber,
        };
      });

      // Submit to Airtable
      await stockCountService.submitStockCounts(submissions);

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Stock count submission error:', error);
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'There was an error submitting your stock count.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessComplete = () => {
    setShowSuccessModal(false);
    navigate('/stock-counts', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-4 shadow-sm">
        <div className="container mx-auto px-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => navigate('/stock-counts')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Stock Count Cart</h1>
          </div>
          <ThemeToggle variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/20" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Progress Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Progress</h2>
                <Badge variant={completedItems === totalItems ? "default" : "secondary"}>
                  {completedItems} / {totalItems} items completed
                </Badge>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Complete details for all items before submitting
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cart Items */}
        <div className="space-y-4">
          {cart.map((item) => {
            const isCompleted = isItemCompleted(item.id);

            return (
              <Card key={item.id} className={cn(
                "transition-all",
                isCompleted && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
              )}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10 overflow-hidden flex-shrink-0">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.deviceType}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <PackageIcon className="h-10 w-10 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{item.deviceType}</h3>
                          <p className="text-sm text-muted-foreground">{item.itemDescription}</p>
                        </div>
                        {isCompleted && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Category: <span className="font-medium text-foreground">{item.itemCategory}</span>
                        </span>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-muted-foreground">
                          Nature: <span className="font-medium text-foreground">{item.itemNature}</span>
                        </span>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-muted-foreground">
                          Qty: <span className="font-medium text-foreground">{item.quantity}</span>
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpenDetailSheet(item)}
                          variant={isCompleted ? "outline" : "default"}
                        >
                          {isCompleted ? 'Edit Details' : 'Enter Details'}
                        </Button>
                        {isCompleted && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItemDetail(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmitStockCount}
            disabled={completedItems < totalItems || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ClipboardList className="mr-2 h-5 w-5" />
                Submit Stock Count ({totalItems} items)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Item Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Item Details</SheetTitle>
            <SheetDescription>
              {selectedCartItem?.deviceType}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Bin Location */}
            <div className="space-y-2">
              <Label htmlFor="binLocation">Bin Location</Label>
              <Input
                id="binLocation"
                value={currentItemData.binLocation}
                onChange={(e) => setCurrentItemData({ ...currentItemData, binLocation: e.target.value })}
                placeholder="Enter bin location"
              />
            </div>

            {/* Item Status */}
            <div className="space-y-2">
              <Label htmlFor="itemStatus">Item Status *</Label>
              <Select
                value={currentItemData.itemStatus}
                onValueChange={(value) => setCurrentItemData({ ...currentItemData, itemStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Overall Condition */}
            <div className="space-y-2">
              <Label htmlFor="overallCondition">Overall Condition</Label>
              <Select
                value={currentItemData.overallCondition}
                onValueChange={(value) => setCurrentItemData({ ...currentItemData, overallCondition: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {condition}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fault Reason */}
            <div className="space-y-2">
              <Label htmlFor="faultReason">Fault Reason</Label>
              <Input
                id="faultReason"
                value={currentItemData.faultReason}
                onChange={(e) => setCurrentItemData({ ...currentItemData, faultReason: e.target.value })}
                placeholder="Enter fault reason (if applicable)"
              />
            </div>

            {/* XLI Case Ref */}
            <div className="space-y-2">
              <Label htmlFor="xliCaseRef">XLI Case Reference</Label>
              <Input
                id="xliCaseRef"
                value={currentItemData.xliCaseRef}
                onChange={(e) => setCurrentItemData({ ...currentItemData, xliCaseRef: e.target.value })}
                placeholder="Enter case reference"
              />
            </div>

            {/* Serial Numbers (only for serialized items) */}
            {selectedCartItem?.itemNature === 'Serialised' && (
              <>
                <Separator />
                <h3 className="font-semibold text-sm text-primary">Serial Numbers</h3>

                {/* Manufacture Serial Number */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="manufactureSerialNumber">Manufacture S/N</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openScanner('manufactureSerialNumber')}
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Scan
                    </Button>
                  </div>
                  <Input
                    id="manufactureSerialNumber"
                    value={currentItemData.manufactureSerialNumber}
                    onChange={(e) => setCurrentItemData({ ...currentItemData, manufactureSerialNumber: e.target.value })}
                    placeholder="Enter or scan serial number"
                  />
                </div>

                {/* QR Code Serial Number */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="qrCodeSerialNumber">QR Code S/N</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openScanner('qrCodeSerialNumber')}
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Scan
                    </Button>
                  </div>
                  <Input
                    id="qrCodeSerialNumber"
                    value={currentItemData.qrCodeSerialNumber}
                    onChange={(e) => setCurrentItemData({ ...currentItemData, qrCodeSerialNumber: e.target.value })}
                    placeholder="Enter or scan QR code"
                  />
                </div>

                {/* Xlink Serial Number */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="xlinkSerialNumber">Xlink S/N</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openScanner('xlinkSerialNumber')}
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Scan
                    </Button>
                  </div>
                  <Input
                    id="xlinkSerialNumber"
                    value={currentItemData.xlinkSerialNumber}
                    onChange={(e) => setCurrentItemData({ ...currentItemData, xlinkSerialNumber: e.target.value })}
                    placeholder="Enter or scan Xlink serial"
                  />
                </div>

                {/* Cradle Serial Number */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cradleSerialNumber">Cradle S/N</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openScanner('cradleSerialNumber')}
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Scan
                    </Button>
                  </div>
                  <Input
                    id="cradleSerialNumber"
                    value={currentItemData.cradleSerialNumber}
                    onChange={(e) => setCurrentItemData({ ...currentItemData, cradleSerialNumber: e.target.value })}
                    placeholder="Enter or scan cradle serial"
                  />
                </div>

                {/* Charger Serial Number */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="chargerSerialNumber">Charger S/N</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openScanner('chargerSerialNumber')}
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Scan
                    </Button>
                  </div>
                  <Input
                    id="chargerSerialNumber"
                    value={currentItemData.chargerSerialNumber}
                    onChange={(e) => setCurrentItemData({ ...currentItemData, chargerSerialNumber: e.target.value })}
                    placeholder="Enter or scan charger serial"
                  />
                </div>
              </>
            )}
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDetailSheet(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveItemDetails}>
              Save Details
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => {
            setShowScanner(false);
            setCurrentScanField(null);
          }}
        />
      )}

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Stock Count Submitted!
            </DialogTitle>
            <DialogDescription>
              Your stock count has been successfully submitted with {totalItems} item(s).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSuccessComplete} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default StockCountsCart;
