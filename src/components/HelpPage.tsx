import { HelpCircle, BookOpen, MessageCircle, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How accurate are the price predictions?',
    answer: 'Our AI model achieves up to 91% accuracy on historical validation. The predictions are based on multiple factors including historical price patterns, seasonal trends, weather data, and market indicators.',
  },
  {
    question: 'How often are prices updated?',
    answer: 'Market prices are updated in real-time during trading hours. Predictions are recalculated daily using the latest available data.',
  },
  {
    question: 'Which crops are currently supported?',
    answer: 'We currently track 10 major crops including Wheat, Rice, Cotton, Sugarcane, Soybean, Maize, Potato, Onion, Tomato, and Groundnut. We are continuously adding more crops.',
  },
  {
    question: 'How do I interpret the confidence score?',
    answer: 'The confidence score indicates how reliable the prediction is. A score above 85% is considered high confidence, 70-85% is moderate, and below 70% suggests higher uncertainty.',
  },
  {
    question: 'Can I set price alerts for specific crops?',
    answer: 'Yes! Go to Settings and enable Price Alerts. You can then customize alerts for specific crops and price thresholds.',
  },
  {
    question: 'What machine learning models are used?',
    answer: 'We use a combination of Random Forest, TensorFlow deep learning models, and time series analysis. OpenCV is used for satellite imagery processing to assess crop health.',
  },
];

export const HelpPage = () => {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Help & Support</h2>
          <p className="text-muted-foreground">Get help with using CropPrice</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-glow p-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Documentation</h3>
          <p className="text-sm text-muted-foreground mb-3">Learn how to use all features</p>
          <Button variant="outline" size="sm" className="gap-2">
            Read Docs <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        <div className="card-glow p-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-3">
            <MessageCircle className="h-6 w-6 text-accent-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Live Chat</h3>
          <p className="text-sm text-muted-foreground mb-3">Chat with our support team</p>
          <Button variant="outline" size="sm" className="gap-2">
            Start Chat
          </Button>
        </div>

        <div className="card-glow p-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-info/20 flex items-center justify-center mb-3">
            <Mail className="h-6 w-6 text-info" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Email Support</h3>
          <p className="text-sm text-muted-foreground mb-3">Get help via email</p>
          <Button variant="outline" size="sm" className="gap-2">
            Send Email
          </Button>
        </div>
      </div>

      {/* FAQs */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Frequently Asked Questions</h3>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Contact Info */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Contact Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">support@cropprice.com</span>
          </div>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">+91 1800-XXX-XXXX (Toll Free)</span>
          </div>
          <p className="text-muted-foreground pt-2">
            Our support team is available Monday to Saturday, 9 AM to 6 PM IST.
          </p>
        </div>
      </div>
    </div>
  );
};
